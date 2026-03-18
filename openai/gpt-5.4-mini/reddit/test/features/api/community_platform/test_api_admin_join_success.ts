import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "admin email should match input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "deleted_at should be null for active admin",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token should exist",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be present",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be present",
    authorized.token.refreshable_until.length > 0,
  );
}
