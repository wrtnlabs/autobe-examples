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

export async function test_api_password_reset_actor_routing_without_account_enumeration(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: `owner-${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const owner: IHrmTimeTrackingOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: ownerJoinBody,
    },
  );
  typia.assert(owner);
  const publicConnection: api.IConnection = { host: connection.host };
  const existingRequestBody = {
    actor: "owner",
    email: ownerJoinBody.email,
  } satisfies IHrmTimeTrackingOwnerPasswordReset.ICreate;
  const existingReset: IHrmTimeTrackingOwnerPasswordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      publicConnection,
      {
        body: existingRequestBody,
      },
    );
  typia.assert(existingReset);
  TestValidator.equals(
    "existing account reset actor type matches owner routing",
    existingReset.actorType,
    "owner",
  );
  const missingRequestBody = {
    actor: "owner",
    email: `missing-${RandomGenerator.alphaNumeric(8)}@example.com`,
  } satisfies IHrmTimeTrackingOwnerPasswordReset.ICreate;
  const missingReset: IHrmTimeTrackingOwnerPasswordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      publicConnection,
      {
        body: missingRequestBody,
      },
    );
  typia.assert(missingReset);
  TestValidator.equals(
    "missing account reset preserves outward actor category",
    missingReset.actorType,
    "owner",
  );
  TestValidator.equals(
    "non-enumerating outward actor type is identical",
    existingReset.actorType,
    missingReset.actorType,
  );
}
