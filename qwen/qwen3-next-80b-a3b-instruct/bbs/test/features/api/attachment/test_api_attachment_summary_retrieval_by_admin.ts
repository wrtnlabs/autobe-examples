import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumAttachmentFile";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_attachment_summary_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin via the authorize_admin_join utility function (priority over SDK)
  const adminAuth: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Use the authenticated admin connection to retrieve attachment summary
  const summary: IPageIEconomicForumAttachmentFile.ISummary =
    await api.functional.economicForum.admin.attachment_files.summary.index(
      adminConnection,
    );
  typia.assert(summary);
  // Validate that summary data array contains exactly one summary record
  TestValidator.equals(
    "summary data array has exactly one entry",
    summary.data.length,
    1,
  );
  // Get the summary record
  const summaryRecord = summary.data[0];
  // Validate the summary record is non-null and is the expected type
  typia.assert(summaryRecord);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    summary.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 50", summary.pagination.limit, 50);
  TestValidator.predicate(
    "pagination records is non-negative",
    summary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    summary.pagination.pages >= 0,
  );
  // Validate summary statistics
  TestValidator.predicate(
    "total_files is non-negative integer",
    summaryRecord.total_files >= 0 &&
      Number.isInteger(summaryRecord.total_files),
  );
  TestValidator.predicate(
    "total_storage_bytes is non-negative integer",
    summaryRecord.total_storage_bytes >= 0 &&
      Number.isInteger(summaryRecord.total_storage_bytes),
  );
  TestValidator.predicate(
    "average_file_size is non-negative",
    summaryRecord.average_file_size >= 0,
  );
  // Validate upload date-time fields
  const oldestDate = new Date(summaryRecord.oldest_upload_at);
  const newestDate = new Date(summaryRecord.newest_upload_at);
  TestValidator.predicate(
    "oldest_upload_at is a valid date-time",
    !isNaN(oldestDate.getTime()),
  );
  TestValidator.predicate(
    "newest_upload_at is a valid date-time",
    !isNaN(newestDate.getTime()),
  );
  TestValidator.predicate(
    "newest_upload_at is not before oldest_upload_at",
    newestDate >= oldestDate,
  );
  // Validate file_type_distribution structure
  const fileTypes = summaryRecord.file_type_distribution;
  TestValidator.predicate(
    "file_type_distribution is an object",
    typeof fileTypes === "object" && fileTypes !== null,
  );
  TestValidator.predicate(
    "file_type_distribution has at least one entry",
    Object.keys(fileTypes).length > 0,
  );
  // Validate all file_type_distribution values are non-negative integers
  Object.values(fileTypes).forEach((count) => {
    TestValidator.predicate(
      "file_type_distribution value is non-negative integer",
      count >= 0 && Number.isInteger(count),
    );
  });
}
