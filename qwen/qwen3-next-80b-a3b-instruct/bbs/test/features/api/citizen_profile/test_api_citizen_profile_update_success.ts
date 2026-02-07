import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinBody: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const authorized = await authorize_citizen_join(citizenConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Create a new citizen connection using the auth token
  const userConnection: api.IConnection = { host: connection.host };
  // The authorize_citizen_join function sets the Authorization header on citizenConnection
  // We copy the host and use the auth token from the authorized response to create a new connection
  if (!citizenConnection.headers?.Authorization) {
    throw new Error("Authorization header was not set after join");
  }
  userConnection.headers = {
    Authorization: citizenConnection.headers.Authorization,
  };
  // 3. Update profile with new display name and bio
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody: IEconomicBoardProfile.IUpdate = {
    display_name: newDisplayName,
    bio: newBio,
  };
  const updatedProfile =
    await api.functional.economicBoard.citizen.profile.update(userConnection, {
      body: updateBody satisfies IEconomicBoardProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Validate the update directly from response
  TestValidator.equals(
    "display_name updated",
    (updatedProfile as any).display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", (updatedProfile as any).bio, newBio);
  TestValidator.predicate(
    "updated_at is set",
    (updatedProfile as any).updated_at !== undefined,
  );
  TestValidator.equals("id preserved", (updatedProfile as any).id, authorized.id);
  // 5. Verify that updated_at is set to a recent time (within 10 seconds of current time in Asia/Seoul)
  const now = new Date();
  const updatedTime = new Date((updatedProfile as any).updated_at);
  const diffMs = Math.abs(now.getTime() - updatedTime.getTime());
  TestValidator.predicate("updated_at is recent", diffMs < 10000);
  // 6. Test display_name uniqueness constraint
  const otherConnection: api.IConnection = { host: connection.host };
  const otherJoinBody: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const otherAuthorized = await authorize_citizen_join(otherConnection, {
    body: otherJoinBody,
  });
  typia.assert(otherAuthorized);
  // Create a connection for the other user
  const otherUserConnection: api.IConnection = { host: connection.host };
  if (!otherConnection.headers?.Authorization) {
    throw new Error("Authorization header was not set after join");
  }
  otherUserConnection.headers = {
    Authorization: otherConnection.headers.Authorization,
  };
  // Try to update display_name to the same one as the first user
  // This should fail with a 409 Conflict because display_name must be unique
  await TestValidator.error("duplicate display_name rejected", async () => {
    await api.functional.economicBoard.citizen.profile.update(
      otherUserConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IEconomicBoardProfile.IUpdate,
      },
    );
  });
  // 7. Validate bio length constraint (500 characters or less)
  const bioTooLong = "a".repeat(501);
  await TestValidator.error("bio too long rejected", async () => {
    await api.functional.economicBoard.citizen.profile.update(userConnection, {
      body: { bio: bioTooLong } satisfies IEconomicBoardProfile.IUpdate,
    });
  });
  // 8. Verify that the profile update was persisted by re-fetching
  const finalProfile =
    await api.functional.economicBoard.citizen.profile.update(userConnection, {
      body: {} satisfies IEconomicBoardProfile.IUpdate,
    });
  typia.assert(finalProfile);
  TestValidator.equals(
    "display_name persisted after re-fetch",
    (finalProfile as any).display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio persisted after re-fetch",
    (finalProfile as any).bio,
    newBio,
  );
}