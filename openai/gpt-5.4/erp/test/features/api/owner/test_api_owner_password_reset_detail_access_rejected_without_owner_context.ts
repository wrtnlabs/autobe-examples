import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingOwnerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_password_reset_detail_access_rejected_without_owner_context(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const anonymousConnection: api.IConnection = { host: connection.host };
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.predicate(
    "owner connection has authorization header",
    typeof ownerConnection.headers?.Authorization === "string" &&
      ownerConnection.headers.Authorization.length > 0,
  );
  TestValidator.equals(
    "anonymous connection has no authorization header",
    anonymousConnection.headers?.Authorization,
    undefined,
  );
  await TestValidator.httpError(
    "password reset detail access is denied without owner context",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.owner.password_resets.at(
        anonymousConnection,
        {
          passwordResetId,
        },
      );
    },
  );
}
