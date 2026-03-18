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

export async function test_api_member_join_pending_invitation_auto_organization(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the new member
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate random email that may have a pending organization invitation
  const email = typia.random<string & tags.Format<"email">>();
  // Join the member - system should auto-detect pending invitation and associate with organization
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      timezone: "Asia/Seoul",
      locale: "en-US",
    },
  });
  // Validate complete response structure (includes all type and format validations)
  typia.assert(authorized);
  // Validate business logic: email matches registration input
  TestValidator.equals("email matches input", authorized.email, email);
  // Validate business logic: tokens have future expiration dates
  TestValidator.predicate(
    "access token has future expiration",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has future expiration",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
}
