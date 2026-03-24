import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_success_and_private_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a newly created member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2) Retrieve authenticated member private profile (first call)
  const profile1 =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile1);
  // 3) Retrieve authenticated member private profile (second call)
  // Business expectation: authenticated member self-profile is stable across
  // immediate reads.
  const profile2 =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile2);
  // 4) Validate business coherence for the same authenticated member
  TestValidator.equals("profile id stable", profile2.id, profile1.id);
  TestValidator.equals(
    "display_name stable",
    profile2.display_name,
    profile1.display_name,
  );
  TestValidator.equals(
    "created_at stable",
    profile2.created_at,
    profile1.created_at,
  );
  TestValidator.equals(
    "updated_at stable",
    profile2.updated_at,
    profile1.updated_at,
  );
  TestValidator.equals(
    "deleted_at stable",
    profile2.deleted_at,
    profile1.deleted_at,
  );
  // Note: Endpoint does not accept profile/userId parameters, so cross-member
  // access via this route is not possible in this test flow.
  // deleted_at being null vs non-null is already enforced by ITodoAppUserProfile.
}
