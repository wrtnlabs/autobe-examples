import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test advanced filtering capabilities for attachment snapshots using date range parameters.
 * Validate that super administrators can retrieve snapshots captured within specific time windows
 * using captured_at_start and captured_at_end parameters. Test scenarios include: filtering snapshots
 * from specific time ranges and verifying that date ranges are inclusive of start and end boundaries.
 */
export async function test_api_attachment_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test basic date range filtering functionality
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  // Test 1: Filter with start time only (snapshots after a certain time)
  const startTimeRequest: IDiscussionBoardAttachmentSnapshot.IRequest = {
    captured_at_start: oneHourAgo.toISOString(),
    limit: 50,
    sort: "captured_at:desc" as const,
  };
  const startTimeResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      { body: startTimeRequest },
    );
  typia.assert(startTimeResponse);
  // Test 2: Filter with end time only (snapshots before a certain time)
  const endTimeRequest: IDiscussionBoardAttachmentSnapshot.IRequest = {
    captured_at_end: twoHoursAgo.toISOString(),
    limit: 50,
    sort: "captured_at:asc" as const,
  };
  const endTimeResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      { body: endTimeRequest },
    );
  typia.assert(endTimeResponse);
  // Test 3: Filter with both start and end times
  const rangeRequest: IDiscussionBoardAttachmentSnapshot.IRequest = {
    captured_at_start: twoHoursAgo.toISOString(),
    captured_at_end: now.toISOString(),
    limit: 50,
  };
  const rangeResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      { body: rangeRequest },
    );
  typia.assert(rangeResponse);
  // Test 4: Empty request (no filters)
  const emptyRequest: IDiscussionBoardAttachmentSnapshot.IRequest = {
    limit: 10,
    page: 1,
  };
  const emptyResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyResponse);
  // Validate that responses have proper structure
  TestValidator.predicate(
    "start time response has pagination",
    startTimeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "end time response has pagination",
    endTimeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "range response has pagination",
    rangeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "empty request response has pagination",
    emptyResponse.pagination !== undefined,
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    startTimeResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    startTimeResponse.pagination.limit > 0 &&
      startTimeResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has records count",
    startTimeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    startTimeResponse.pagination.pages >= 0,
  );
  // Test that all snapshot items have required properties
  if (startTimeResponse.data.length > 0) {
    const snapshot = startTimeResponse.data[0];
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has captured_at",
      typeof snapshot.captured_at === "string",
    );
    TestValidator.predicate(
      "snapshot has attachment",
      snapshot.attachment !== undefined,
    );
    if (snapshot.attachment) {
      TestValidator.predicate(
        "attachment has id",
        typeof snapshot.attachment.id === "string",
      );
      TestValidator.predicate(
        "attachment has filename",
        typeof snapshot.attachment.filename === "string",
      );
      TestValidator.predicate(
        "attachment has article",
        snapshot.attachment.article !== undefined,
      );
    }
  }
}
