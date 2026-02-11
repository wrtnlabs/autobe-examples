import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create";
import { prepare_random_reddit_platform_report_resolution } from "../../../prepare/prepare_random_reddit_platform_report_resolution";

export async function test_api_report_resolution_notes_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(2),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create a report resolution without notes
  const reportResolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: typia.random<string & tags.Format<"uuid">>(),
          status: "RESOLVED",
          resolution_notes: null,
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(reportResolution);
  // 3. Test: Add resolution notes to null
  const updateWithNotes =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: reportResolution.id,
        body: {
          status: "RESOLVED",
          resolution_notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(updateWithNotes);
  TestValidator.equals(
    "notes added",
    updateWithNotes.resolution_notes,
    updateWithNotes.resolution_notes,
  );
  // 4. Test: Update existing resolution notes
  const updatedNotes = RandomGenerator.paragraph({ sentences: 2 });
  const updateUpdatedNotes =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: reportResolution.id,
        body: {
          status: "DISMISSED",
          resolution_notes: updatedNotes,
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(updateUpdatedNotes);
  TestValidator.equals(
    "notes updated",
    updateUpdatedNotes.resolution_notes,
    updatedNotes,
  );
  // 5. Test: Clear resolution notes by setting to null
  const updateClearedNotes =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: reportResolution.id,
        body: {
          status: "RESOLVED",
          resolution_notes: null,
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(updateClearedNotes);
  TestValidator.equals(
    "notes cleared",
    updateClearedNotes.resolution_notes,
    null,
  );
  // 6. Test: Special characters in notes
  const specialNotes =
    "Test with special chars: @#$%^&*()_+-=[]{}|;':\"\\|,.<>/?~\n\r\t";
  const updateSpecialNotes =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: reportResolution.id,
        body: {
          status: "RESOLVED",
          resolution_notes: specialNotes,
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(updateSpecialNotes);
  TestValidator.equals(
    "special chars preserved",
    updateSpecialNotes.resolution_notes,
    specialNotes,
  );
}
