import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVoteLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLog";

/**
 * Test moderator access to search and retrieve paginated voting logs for audit,
 * anti-abuse, and compliance review.
 *
 * 1. Register a member account (user).
 * 2. Create a file upload (referenceable file).
 * 3. Create a community (moderator assignment target).
 * 4. Register a moderator account assigned to the created community.
 * 5. Create a post as the member for voting.
 * 6. Member casts a vote (upvote) to produce a vote log.
 * 7. As moderator, search for voting logs with filter by member id, by post id, by
 *    different sorts and vote values.
 * 8. Check only moderators can access vote logs and that logs are accurate. Ensure
 *    denying unauthenticated/non-moderator access.
 */
export async function test_api_vote_log_moderator_audit_and_abuse_investigation(
  connection: api.IConnection,
) {
  // 1. Register a member (user)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssword!123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const memberId = member.id;

  // 2. Create a file upload owned by member
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberId,
          original_filename: RandomGenerator.alphabets(10) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(24),
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          url: `https://files.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 3. Member creates a community
  const communitySlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(6),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 16,
            wordMin: 5,
            wordMax: 10,
          }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;

  // 4. Register moderator for the new community (using same email for simplicity)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      community_id: communityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 5. Create a post as a member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        content_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 14,
        }),
        content_type: "text",
        status: "published",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const postId = post.id;

  // 6. Member votes (upvote) on own post to generate a vote log
  const postVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId,
        body: {
          vote_value: 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postVote);

  // 7. As moderator, retrieve vote logs with pagination and filters
  //    (simulate moderator login by ensuring token for auth.moderator.join is used)
  const voteLogFilters: ICommunityPlatformVoteLog.IRequest[] = [
    {}, // no filter - should retrieve at least the log
    { member_id: memberId },
    { content_type: "post" },
    { content_id: postId },
    { vote_value: 1 },
    { action_status: "success" },
    { sort_by: "created_at", order: "desc" },
    { page: 1, limit: 5 },
  ];
  for (const filter of voteLogFilters) {
    const page: IPageICommunityPlatformVoteLog =
      await api.functional.communityPlatform.moderator.voteLogs.index(
        connection,
        {
          body: filter,
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      `moderator can view vote logs with filter ${JSON.stringify(filter)}`,
      page.data.length >= 1,
    );
    TestValidator.predicate(
      `vote log content structure valid (${JSON.stringify(filter)})`,
      Array.isArray(page.data) &&
        page.data.every(
          (item) =>
            item.hasOwnProperty("community_platform_member_id") &&
            (item.community_platform_post_id === postId ||
              !item.community_platform_post_id),
        ),
    );
  }

  // 8. Ensure non-moderator (unauthenticated) cannot access vote logs
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-moderator cannot access vote logs",
    async () => {
      await api.functional.communityPlatform.moderator.voteLogs.index(
        unauthConn,
        {
          body: { member_id: memberId },
        },
      );
    },
  );
}
