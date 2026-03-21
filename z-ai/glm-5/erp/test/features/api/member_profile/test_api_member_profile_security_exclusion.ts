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

export async function test_api_member_profile_security_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known credentials (including password)
  const memberConnection: api.IConnection = { host: connection.host };
  const knownPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      password: knownPassword,
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve the member's profile
  const profile =
    await api.functional.erpHrm.member.members.at(memberConnection);
  typia.assert(profile);
  // 3. Verify NO password-related fields are exposed in profile response
  const profileAny = profile as Record<string, unknown>;
  TestValidator.predicate("password not exposed", !("password" in profileAny));
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in profileAny),
  );
  TestValidator.predicate(
    "hashed_password not exposed",
    !("hashed_password" in profileAny),
  );
  // 4. Verify NO authentication token fields are exposed in profile response
  TestValidator.predicate("token not exposed", !("token" in profileAny));
  TestValidator.predicate("access not exposed", !("access" in profileAny));
  TestValidator.predicate("refresh not exposed", !("refresh" in profileAny));
  TestValidator.predicate(
    "expired_at not exposed",
    !("expired_at" in profileAny),
  );
  TestValidator.predicate(
    "refreshable_until not exposed",
    !("refreshable_until" in profileAny),
  );
  // 5. Verify the profile data matches the authorized member (business logic validation)
  TestValidator.equals(
    "profile id matches authorized id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email matches authorized email",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile display_name matches",
    profile.display_name,
    authorized.display_name,
  );
}
