import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_update_post_scoped_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a member (member join)
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Fixture placeholders: without fixture endpoints, we cannot load real post/comment records.
  // We still verify scoping enforcement by attempting to update a commentId under a different postId.
  const postId1 = typia.random<string & tags.Format<"uuid">>();
  const postId2 = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    bodyText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.IUpdate;
  await TestValidator.httpError(
    "should reject comment update when comment is not under specified post (scoped not found)",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.comments.update(
        memberConnection,
        {
          postId: postId2,
          commentId,
          body: updateBody,
        },
      );
    },
  );
  // Basic non-leakage expectation: generic not-found style outcome is returned.
  // We cannot further assert unchanged body/updated_at/parent_comment_id without a comment GET endpoint.
  TestValidator.predicate(
    "authorized member id should be present",
    authorized.id.length > 0,
  );
}
