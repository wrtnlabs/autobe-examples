import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_post_multiple_content_fields(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to create post with both textContent and url (violating exclusivity) using base connection directly
  // This tests the constraint validation BEFORE authentication or community checks
  const badPostBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    communityName: RandomGenerator.alphabets(12), // Valid format, unknown community (won't exist)
    textContent: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: "https://example.com",
  } satisfies IRedditCommunityPost.ICreate;
  // Expect HTTP 400 error due to multiple content fields AND verify error message contains required text
  await TestValidator.httpError(
    "multiple content fields rejected",
    400,
    async () => {
      const error = await api.functional.redditCommunity.member.posts
        .create(connection, { body: badPostBody })
        .catch((err: any) => err);
      if (
        error &&
        typeof error === "object" &&
        typeof error.message === "string"
      ) {
        if (
          !error.message.includes("exactly one content type must be provided")
        ) {
          throw new Error(
            'Error message does not contain required text: "exactly one content type must be provided"',
          );
        }
      }
      throw error;
    },
  );
}
