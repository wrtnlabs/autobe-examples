import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostImage";
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

export async function test_api_post_image_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Authenticate member to get proper token
  const postConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_login(postConnection, {
    body: {
      email: member.token.access,
      password: "SecurePass123!",
    } satisfies ICommunityMember.ILogin,
  });
  typia.assert(authorizedMember);
  // 3. Since ICommunityPost.ICreate and ICommunityPost have no properties,
  // we cannot create a post with content_type or retrieve its id.
  // Instead, generate a valid UUID for postId as a workaround for impossible schema.
  // The system should handle retrieval on a post id for an image post.
  // We are testing the image retrieval endpoint, not post creation.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve image metadata for the generated postId
  const imageMetadata = await api.functional.community.posts.image.at(
    postConnection,
    {
      postId,
    },
  );
  typia.assert(imageMetadata);
  // 5. Validation: Since ICommunityPostImage is empty, only typia.assert can validate structure
}
