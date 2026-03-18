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

export async function test_api_password_reset_actor_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  // The completion API requires a reset token, but the allowed response surface
  // for reset creation does not expose any raw token field. This test therefore
  // uses the only credential-like issued identifier available from the contract
  // to verify the observable actor-mismatch rejection and non-consumption flow.
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "$Reset1234!Aa",
    href: "https://example.com/owner/join",
    referrer: "https://example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const owner: IHrmTimeTrackingOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(owner);
  const publicConnection: api.IConnection = { host: connection.host };
  const resetRequest: IHrmTimeTrackingOwnerPasswordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      publicConnection,
      {
        body: {
          actor: "owner",
          email: joinInput.email,
        },
      },
    );
  typia.assert(resetRequest);
  TestValidator.equals(
    "created reset belongs to owner actor",
    resetRequest.actorType,
    "owner",
  );
  TestValidator.equals(
    "created reset is not consumed initially",
    resetRequest.used_at,
    null,
  );
  await TestValidator.error(
    "rejects password reset when actor does not match issued token source",
    async () => {
      await api.functional.hrmTimeTracking.owner.password_resets.resetPassword(
        publicConnection,
        {
          body: {
            actor: "manager",
            token: resetRequest.id,
            password: "$Reset5678!Bb",
          } satisfies IHrmTimeTrackingOwnerPasswordReset.IRequest,
        },
      );
    },
  );
  const completed: IHrmTimeTrackingOwnerPasswordReset =
    await api.functional.hrmTimeTracking.owner.password_resets.resetPassword(
      publicConnection,
      {
        body: {
          actor: "owner",
          token: resetRequest.id,
          password: "$Reset9012!Cc",
        } satisfies IHrmTimeTrackingOwnerPasswordReset.IRequest,
      },
    );
  typia.assert(completed);
  TestValidator.equals(
    "completed reset remains on owner actor",
    completed.actorType,
    "owner",
  );
  TestValidator.predicate(
    "reset credential remains consumable after mismatched actor attempt",
    completed.used_at !== null,
  );
}
