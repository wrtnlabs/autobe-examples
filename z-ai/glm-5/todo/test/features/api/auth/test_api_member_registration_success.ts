import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Execute member registration using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(authorized);
  // Validate member data
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("displayName is null", authorized.displayName, null);
  TestValidator.equals("deletedAt is null", authorized.deletedAt, null);
  // Validate token structure
  TestValidator.predicate(
    "token has access",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  // Validate timestamps are recent
  const now = new Date();
  const createdDate = new Date(authorized.createdAt);
  const updatedDate = new Date(authorized.updatedAt);
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  TestValidator.predicate(
    "createdAt is recent",
    createdDate >= oneMinuteAgo && createdDate <= now,
  );
  TestValidator.predicate(
    "updatedAt is recent",
    updatedDate >= oneMinuteAgo && updatedDate <= now,
  );
}
