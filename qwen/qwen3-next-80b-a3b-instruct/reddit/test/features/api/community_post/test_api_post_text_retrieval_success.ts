import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_text_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  // Generate random text content for the post
  const submittedText = RandomGenerator.paragraph({ sentences: 4 });
  // Create a text post with the generated content
  const postResponse = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {
        content_type: "text",
        title: RandomGenerator.name(),
        content: submittedText,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(postResponse);
  // Retrieve the text content of the created post
  const retrievedText = await api.functional.community.posts.text.at(
    memberConnection,
    {
      postId: (postResponse as any as IEntity).id,
    },
  );
  typia.assert(retrievedText);
  // Validate that the retrieved text matches exactly what was submitted
  TestValidator.equals(
    "retrieved text matches created content",
    retrievedText,
    submittedText,
  );
}
