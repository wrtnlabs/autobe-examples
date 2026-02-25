import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_duration_update_successful_modification(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(auth);
  // Create actor-specific connection with authentication token
  superAdminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // Generate realistic UUID for test scenario
  const existingDurationId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update data with realistic values
  const updateData: IDiscussionBoardBanDuration.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    duration_hours: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<168>
    >(),
    is_permanent: false,
  } satisfies IDiscussionBoardBanDuration.IUpdate;
  // Update the ban duration
  const updatedDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.update(
      superAdminConnection,
      {
        durationId: existingDurationId,
        body: updateData,
      },
    );
  typia.assert(updatedDuration);
  // Validate the response
  TestValidator.equals(
    "duration ID matches",
    updatedDuration.id,
    existingDurationId,
  );
  TestValidator.equals(
    "name updated correctly",
    updatedDuration.name,
    updateData.name!,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedDuration.description,
    updateData.description!,
  );
  TestValidator.equals(
    "duration hours updated correctly",
    updatedDuration.duration_hours,
    updateData.duration_hours!,
  );
  TestValidator.equals(
    "permanent flag updated correctly",
    updatedDuration.is_permanent,
    updateData.is_permanent!,
  );
  // Verify updated_at is recent and after created_at
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedDuration.updated_at) > new Date(updatedDuration.created_at),
  );
  // Verify business logic: if permanent, duration should be 0
  if (updatedDuration.is_permanent) {
    TestValidator.equals(
      "permanent ban should have 0 duration hours",
      updatedDuration.duration_hours,
      0,
    );
  }
}
