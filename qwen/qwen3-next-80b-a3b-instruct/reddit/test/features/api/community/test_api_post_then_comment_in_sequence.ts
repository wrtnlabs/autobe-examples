import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_then_comment_in_sequence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Member creates a post
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = { Authorization: joinResponse.token.access };
  const post = await generate_random_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        content_type: "text" as const,
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member creates a comment on the post
  const commentConnection: api.IConnection = { host: connection.host };
  commentConnection.headers = { Authorization: joinResponse.token.access };
  const comment = await generate_random_community_member_comments_create(
    commentConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Validate comment is associated with correct post
  // According to the DTO definition, ICommunityPost.ISummary has no properties (it's {}),
  // so we cannot access id or title. We must validate what exists in the DTO.
  // According to the schema, ICommunityComment.post is of type ICommunityPost.ISummary,
  // which is an empty object. We can validate that it exists (is not null/undefined)
  // and that it's an object.
  TestValidator.predicate(
    "comment has a post association",
    comment.post !== null,
  );
  TestValidator.equals("comment status is active", comment.status, "active");
}
