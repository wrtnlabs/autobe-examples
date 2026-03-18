import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_vote_create_update_and_remove(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers ??= {};
  authorizedConnection.headers.Authorization = memberAuth.token.access;
  // Create Post A and Post B
  const postA = await (async () => {
    const createdConnection: api.IConnection = { host: connection.host };
    const prepared =
      await generate_random_community_platform_member_posts_create(
        createdConnection,
        {
          body: {
            post_type: "text",
            title: RandomGenerator.name(),
            body_text: RandomGenerator.paragraph({ sentences: 2 }),
            community_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    // generation function returns void in provided materials, so we must create post via SDK?
    // However the provided generator signature returns void; adjust by using it for side effect and then not possible to get ids.
    return prepared as unknown as ICommunityPlatformPost.ISummary;
  })();
  const postB = await (async () => {
    const createdConnection: api.IConnection = { host: connection.host };
    const prepared =
      await generate_random_community_platform_member_posts_create(
        createdConnection,
        {
          body: {
            post_type: "text",
            title: RandomGenerator.name(),
            body_text: RandomGenerator.paragraph({ sentences: 2 }),
            community_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    return prepared as unknown as ICommunityPlatformPost.ISummary;
  })();
  // NOTE: Because generator functions for posts_create return void in the provided materials,
  // we cannot reliably obtain real post IDs. This must be fixed by using the SDK create
  // which returns void too in provided materials; therefore the scenario can't be executed.
  // To ensure compilation correctness, throw a runtime error.
  throw new Error(
    "Unable to obtain postId/commentId because provided generation/SDK signatures return void in the given materials.",
  );
}
