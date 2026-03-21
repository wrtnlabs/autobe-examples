import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_member_login_multiple_organizations(
  connection: api.IConnection,
): Promise<void> {
  // Define consistent password for join and login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  // Step 1: Create member account with first organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(joinResult);
  // Step 2: Create second organization while authenticated
  const secondOrg = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {},
  );
  typia.assert(secondOrg);
  // Step 3: Login the member and verify response
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IErpHrmMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 4: Validate login response
  TestValidator.equals("member email matches", loginResult.email, memberEmail);
  TestValidator.predicate("has valid member id", loginResult.id.length > 0);
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token not expired",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  // Step 5: Verify authenticated connection works
  const thirdOrg = await generate_random_erp_hrm_member_organizations_create(
    loginConnection,
    {},
  );
  typia.assert(thirdOrg);
}
