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

export async function test_api_owner_password_reset_delete_stale_request_cleanup(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IHrmTimeTrackingOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    },
  );
  typia.assert(owner);
  const preservedOwnerId = owner.id;
  const preservedOwnerEmail = owner.email;
  const preservedOwnerCreatedAt = owner.created_at;
  const preservedOwnerDeletedAt = owner.deleted_at;
  const preservedOwnerDeactivatedAt = owner.deactivated_at;
  const passwordReset: IHrmTimeTrackingOwnerPasswordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      ownerConnection,
      {
        body: {
          actor: "owner",
          email: owner.email,
        },
      },
    );
  typia.assert(passwordReset);
  TestValidator.equals(
    "password reset actor type is owner",
    passwordReset.actorType,
    "owner",
  );
  TestValidator.notEquals(
    "password reset id differs from owner id",
    passwordReset.id,
    owner.id,
  );
  TestValidator.equals(
    "password reset is initially unused",
    passwordReset.used_at,
    null,
  );
  TestValidator.equals(
    "password reset is initially not soft deleted",
    passwordReset.deleted_at,
    null,
  );
  await api.functional.hrmTimeTracking.owner.password_resets.erase(
    ownerConnection,
    {
      passwordResetId: passwordReset.id,
    },
  );
  TestValidator.equals("owner id unchanged", owner.id, preservedOwnerId);
  TestValidator.equals(
    "owner email unchanged",
    owner.email,
    preservedOwnerEmail,
  );
  TestValidator.equals(
    "owner created_at unchanged",
    owner.created_at,
    preservedOwnerCreatedAt,
  );
  TestValidator.equals(
    "owner deleted_at unchanged",
    owner.deleted_at,
    preservedOwnerDeletedAt,
  );
  TestValidator.equals(
    "owner deactivated_at unchanged",
    owner.deactivated_at,
    preservedOwnerDeactivatedAt,
  );
}
