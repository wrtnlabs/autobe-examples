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

export async function test_api_password_reset_completion_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinBody = {
    email: ownerEmail,
    password: RandomGenerator.alphaNumeric(16),
    href,
    referrer,
    ip,
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: joinBody,
    });
  typia.assert(authorized);
  const issued: IHrmTimeTrackingOwnerPasswordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      ownerConnection,
      {
        body: {
          actor: "owner",
          email: ownerEmail,
        } satisfies IHrmTimeTrackingOwnerPasswordReset.ICreate,
      },
    );
  typia.assert(issued);
  TestValidator.equals("issued actor type is owner", issued.actorType, "owner");
  TestValidator.equals(
    "issued reset is not yet consumed",
    issued.used_at,
    null,
  );
  const resetBody = {
    actor: "owner",
    token: issued.id,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHrmTimeTrackingOwnerPasswordReset.IRequest;
  const completion: IHrmTimeTrackingOwnerPasswordReset =
    await api.functional.hrmTimeTracking.owner.password_resets.resetPassword(
      ownerConnection,
      {
        body: resetBody,
      },
    );
  typia.assert(completion);
  TestValidator.equals(
    "completed reset keeps same record id",
    completion.id,
    issued.id,
  );
  TestValidator.equals(
    "completed actor type is owner",
    completion.actorType,
    "owner",
  );
  TestValidator.notEquals(
    "consumption timestamp becomes populated",
    completion.used_at,
    issued.used_at,
  );
  TestValidator.predicate(
    "consumption timestamp is non-null",
    completion.used_at !== null,
  );
  await TestValidator.error("password reset token is single-use", async () => {
    await api.functional.hrmTimeTracking.owner.password_resets.resetPassword(
      ownerConnection,
      {
        body: {
          actor: "owner",
          token: issued.id,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IHrmTimeTrackingOwnerPasswordReset.IRequest,
      },
    );
  });
}
