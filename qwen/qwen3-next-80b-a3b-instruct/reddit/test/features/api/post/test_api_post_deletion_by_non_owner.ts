import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_deletion_by_non_owner(
  connection: api.IConnection,
) {
  // Step 1: Create first connection for the post owner
  const ownerConnection: api.IConnection = { ...connection };

  // Step 2: Create the post owner's member account
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const owner: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(ownerConnection, {
      body: {
        email: ownerEmail,
        password: "Password123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(owner);

  // Step 3: Create a community to associate the post with
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create the post by the first member using ownerConnection
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      ownerConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          post_type: "text",
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 5: Create a second connection for the non-owner
  const nonOwnerConnection: api.IConnection = { ...connection };

  // Step 6: Create the non-owner member account using nonOwnerConnection
  const nonOwnerEmail: string = typia.random<string & tags.Format<"email">>();
  const nonOwner: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(nonOwnerConnection, {
      body: {
        email: nonOwnerEmail,
        password: "Password123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(nonOwner);

  // Step 7: Attempt to delete the post that belongs to another user with nonOwnerConnection
  await TestValidator.error(
    "non-owner delete attempt should throw error due to ownership violation",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(
        nonOwnerConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
