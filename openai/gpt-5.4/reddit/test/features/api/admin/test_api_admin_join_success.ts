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
  const email = typia.random<string & tags.Format<"email">>();
  const href = `https://example.com/admin/onboarding/${RandomGenerator.alphabets(8)}`;
  const referrer = `https://example.com/${RandomGenerator.alphabets(6)}`;
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(authorized);
  TestValidator.equals(
    "email matches submitted value",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "email is not yet verified on join",
    authorized.email_verified_at,
    null,
  );
  TestValidator.equals(
    "no previous sign-in is recorded on first join",
    authorized.last_signed_in_at,
    null,
  );
  TestValidator.equals("account is not deleted", authorized.deleted_at, null);
  TestValidator.equals(
    "authorization header is established from issued access token",
    adminConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.predicate(
    "administrator id is populated",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "status is initialized",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(authorized.updated_at).getTime() >=
      new Date(authorized.created_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable deadline is not earlier than access expiry",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
