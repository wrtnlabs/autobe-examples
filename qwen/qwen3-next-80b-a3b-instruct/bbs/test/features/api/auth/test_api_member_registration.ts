import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";

export async function test_api_member_registration(
  connection: api.IConnection,
) {
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: typia.random<string>(),
  } satisfies IEconomicBoardMember.ICreate;

  const registeredMember: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  TestValidator.equals(
    "email matches input",
    registeredMember.email,
    registrationData.email,
  );
}
