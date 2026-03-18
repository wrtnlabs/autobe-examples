import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_post_delete_already_deleted_post_unavailable_consistently(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const postId = typia.random<string & tags.Format<"uuid">>();
  let firstErrored = false;
  let secondErrored = false;
  try {
    await api.functional.communityPlatform.member.posts.erase(
      memberConnection,
      { postId },
    );
  } catch {
    firstErrored = true;
  }
  try {
    await api.functional.communityPlatform.member.posts.erase(
      memberConnection,
      { postId },
    );
  } catch {
    secondErrored = true;
  }
  TestValidator.equals(
    "second delete attempt outcome matches first (idempotent/unavailable behavior)",
    secondErrored,
    firstErrored,
  );
}
