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
import { generate_random_hrm_time_tracking_owner_password_resets_create } from "../../../generate/generate_random_hrm_time_tracking_owner_password_resets_create";
import { prepare_random_hrm_time_tracking_owner_password_reset } from "../../../prepare/prepare_random_hrm_time_tracking_owner_password_reset";

export async function test_api_password_reset_owner_request_accepted(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = typia.random<string & tags.Format<"password">>();
  const joinInput = {
    email: ownerEmail,
    password: ownerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized = await authorize_owner_join(ownerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const publicConnection: api.IConnection = { host: connection.host };
  const reset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      publicConnection,
      {
        body: {
          actor: "owner",
          email: ownerEmail,
        } satisfies IHrmTimeTrackingOwnerPasswordReset.ICreate,
      },
    );
  typia.assert(reset);
  TestValidator.equals("actor type is owner", reset.actorType, "owner");
  TestValidator.equals("reset is unused on creation", reset.used_at, null);
  TestValidator.equals(
    "reset is not deleted on creation",
    reset.deleted_at,
    null,
  );
  const now = Date.now();
  const createdAt = new Date(reset.created_at).getTime();
  const updatedAt = new Date(reset.updated_at).getTime();
  const expiredAt = new Date(reset.expired_at).getTime();
  TestValidator.predicate("expiration is in the future", expiredAt > now);
  TestValidator.predicate(
    "expiration is not earlier than creation",
    expiredAt >= createdAt,
  );
  TestValidator.predicate(
    "update timestamp is not earlier than creation",
    updatedAt >= createdAt,
  );
  const responseKeys = Object.keys(reset).sort();
  TestValidator.equals(
    "response exposes only documented public lifecycle fields",
    responseKeys,
    [
      "actorType",
      "created_at",
      "deleted_at",
      "expired_at",
      "id",
      "updated_at",
      "used_at",
    ],
  );
}
