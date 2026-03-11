import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_comment_banned_user_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(communityOwnerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(communityOwner);
  // 2. Setup: Create banned member account
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(bannedMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(bannedMember);
  // 3. Setup: Create non-banned member account for comparison
  const nonBannedMemberConnection: api.IConnection = { host: connection.host };
  const nonBannedMember: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(nonBannedMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(nonBannedMember);
  // 4. Setup: Create test community with community owner
  const testCommunity: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        },
      },
    );
  typia.assert(testCommunity);
  // 5. Setup: Ban banned member from community using community owner
  const banRecord: IRedditPlatformCommunityBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      communityOwnerConnection,
      {
        body: {
          userId: bannedMember.user.id,
          expiresAt: null,
        },
        params: {
          communityId: testCommunity.id,
        },
      },
    );
  typia.assert(banRecord);
  // 6. Setup: Assume post exists (scenario prerequisite)
  // Create a post reference (post_id must come from existing data in real scenario)
  const testPost: IRedditPlatformPost.ISummary =
    typia.random<IRedditPlatformPost.ISummary>();
  // 7. Validation: Banned user attempts to create comment (should fail)
  await TestValidator.httpError(
    "banned user cannot create comment",
    [403],
    async () => {
      await api.functional.redditPlatform.member.comments.create(
        bannedMemberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
            post_id: testPost.id,
            parent_comment_id: null,
          },
        },
      );
    },
  );
  // 8. Validation: Non-banned user creates comment successfully
  const successfulComment: IRedditPlatformComment =
    await api.functional.redditPlatform.member.comments.create(
      nonBannedMemberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          post_id: testPost.id,
          parent_comment_id: null,
        },
      },
    );
  typia.assert(successfulComment);
  // 9. Validate comment belongs to correct post and community
  TestValidator.equals(
    "comment post_id matches",
    successfulComment.post?.id,
    testPost.id,
  );
}
