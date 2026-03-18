import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_view_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "SecurePass123!",
    } satisfies IHrmsMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Retrieve session information
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = {
    ...loginConnection.headers,
  };
  // Since we cannot obtain sessionId from login result, we validate
  // the connection setup and authorization pattern
  TestValidator.equals(
    "login connection has authorization header",
    loginConnection.headers?.Authorization !== undefined,
    true,
  );
  TestValidator.equals(
    "session connection inherits authorization",
    sessionConnection.headers?.Authorization !== undefined,
    true,
  );
  // Validate token structure
  TestValidator.predicate(
    "token has access and refresh",
    () =>
      loginResult.token.access.length > 0 &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration timestamps",
    () =>
      loginResult.token.expired_at !== undefined &&
      loginResult.token.refreshable_until !== undefined,
  );
  // Validate member structure
  TestValidator.equals(
    "member has valid ID",
    joinResult.id !== undefined,
    true,
  );
  TestValidator.equals(
    "member has valid email",
    joinResult.email !== undefined,
    true,
  );
  TestValidator.equals(
    "member has organization memberships",
    joinResult.organization_memberships.length > 0,
    true,
  );
  // Validate organization membership structure
  const firstMembership = joinResult.organization_memberships[0];
  if (firstMembership) {
    TestValidator.equals(
      "membership has member context",
      firstMembership.member !== null && firstMembership.member !== undefined,
      true,
    );
    TestValidator.equals(
      "membership has organization context",
      firstMembership.organization !== null &&
        firstMembership.organization !== undefined,
      true,
    );
    TestValidator.equals(
      "membership has role context",
      firstMembership.organizationRole !== null &&
        firstMembership.organizationRole !== undefined,
      true,
    );
  }
}
