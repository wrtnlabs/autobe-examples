import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_user } from "../../../prepare/prepare_random_discussion_board_user";
import { generate_random_discussion_board_users_create } from "../../../generate/generate_random_discussion_board_users_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_citizen_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate the citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const citizenAuthResult = await authorize_member_join(citizenConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(citizenAuthResult);
  // Step 2: Create the citizen profile using the authenticated connection
  const createdCitizen = await generate_random_discussion_board_users_create(
    citizenConnection,
    {
      body: {
        email: joinEmail, // Now use the stored email from the join request, not from auth result
        password: joinPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardUser.ICreate,
    },
  );
  typia.assert(createdCitizen);
  // Step 3: Prepare update data with valid changes
  const updateData: IDiscussionBoardCitizen.IUpdate = {
    name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    profile_visibility: "private",
  } satisfies IDiscussionBoardCitizen.IUpdate;
  // Step 4: Perform the profile update using the citizen's authenticated connection
  const updatedCitizen =
    await api.functional.discussionBoard.citizen.citizens.update(
      citizenConnection,
      {
        citizenId: createdCitizen.id,
        body: updateData,
      },
    );
  typia.assert(updatedCitizen);
  // Step 5: Validate that the update was successful and system-managed fields are unchanged
  TestValidator.equals("name updated", updatedCitizen.name, updateData.name);
  TestValidator.equals("bio updated", updatedCitizen.bio, updateData.bio);
  // profile_visibility does not exist on IDiscussionBoardCitizen response type! It is a write-only update field.
  // Do NOT validate profile_visibility on response - it's not returned.
  TestValidator.equals("id preserved", updatedCitizen.id, createdCitizen.id);
  // The errors indicate email, registration_date, and last_login do NOT exist on IDiscussionBoardCitizen
  // Therefore, we cannot validate them. They may be internal properties not returned in the API response.
  // Only validate properties that exist on IDiscussionBoardCitizen according to the compiler.
  // Step 6: Verify that the connection isolation works correctly
  // Create a new connection without authentication
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot update profile",
    async () => {
      await api.functional.discussionBoard.citizen.citizens.update(
        unauthConnection,
        {
          citizenId: createdCitizen.id,
          body: { name: "hacked" } satisfies IDiscussionBoardCitizen.IUpdate,
        },
      );
    },
  );
}
