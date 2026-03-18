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

export async function test_api_owner_password_reset_completion_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const guestConnection: api.IConnection = { host: connection.host };
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    token: RandomGenerator.alphaNumeric(32),
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
  } satisfies IHrmTimeTrackingOwnerPasswordReset.IUpdate;
  const reset =
    await api.functional.hrmTimeTracking.owner.password_resets.update(
      guestConnection,
      {
        passwordResetId,
        body: updateBody,
      },
    );
  typia.assert(reset);
  TestValidator.equals(
    "password reset id matches request",
    reset.id,
    passwordResetId,
  );
  TestValidator.equals(
    "resolved actor type is owner",
    reset.actorType,
    "owner",
  );
  TestValidator.notEquals(
    "used_at is populated after successful completion",
    reset.used_at,
    null,
  );
}
