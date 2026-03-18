import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManagerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManagerSession";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_profile_update_shared_identity_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    });
  typia.assert(authorized);
  const updateBody = {
    displayName: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
    avatarImage: typia.random<string & tags.Format<"uri">>(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IHrmTimeTrackingManagerSession.IUpdate;
  const profile = await api.functional.hrmTimeTracking.owner.profile.update(
    ownerConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(profile);
  TestValidator.equals(
    "updated display name matches saved shared profile value",
    profile.displayName,
    updateBody.displayName,
  );
  TestValidator.equals(
    "updated avatar image matches saved shared profile value",
    profile.avatarImage,
    updateBody.avatarImage,
  );
  TestValidator.equals(
    "updated phone number matches saved shared profile value",
    profile.phoneNumber,
    updateBody.phoneNumber,
  );
  const expectedProfile = {
    displayName: updateBody.displayName,
    avatarImage: updateBody.avatarImage,
    phoneNumber: updateBody.phoneNumber,
  } satisfies IHrmTimeTrackingManagerSession;
  TestValidator.equals(
    "response returns the canonical shared personal profile fields",
    profile,
    expectedProfile,
  );
}
