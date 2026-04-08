import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account via join (automatically authenticates)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the authenticated member's profile
  const profile =
    await api.functional.erpHrm.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile matches the registered member data
  TestValidator.equals("profile id matches", profile.id, authorized.id);
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "created_at is valid",
    typeof profile.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is valid",
    typeof profile.updated_at,
    "string",
  );
}
