import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_image_attachment_viewing_boundary_disallowed_context(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: boundary check for media read endpoint.
  // Given we only have member join and the media GET endpoint (no post/image creation APIs),
  // we validate that:
  // 1) Disallowed context (no Authorization token) cannot access the attachment.
  // 2) Even an authorized member cannot access an attachment that does not exist (404).
  const postId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // Disallowed context: guest/no token
  await TestValidator.httpError(
    "should reject guest context for post image attachment",
    [401, 403, 404],
    async () =>
      await api.functional.communityPlatform.member.posts.images.at(
        connection,
        {
          postId,
          imageId,
        },
      ),
  );
  // Allowed context: authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  await TestValidator.httpError(
    "should not return attachment if it does not exist (even for authorized member)",
    [404, 401, 403],
    async () =>
      await api.functional.communityPlatform.member.posts.images.at(
        authorizedConnection,
        {
          postId,
          imageId,
        },
      ),
  );
}
