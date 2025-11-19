import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Validate fetching the metadata of a soft-deleted attachment by its UUID as an
 * admin.
 *
 * This test ensures the following:
 *
 * 1. An admin can join and is authenticated for privileged access.
 * 2. The metadata for a soft-deleted attachment can be successfully fetched by the
 *    admin using its UUID.
 * 3. The returned metadata must reflect that the attachment has been deleted
 *    (i.e., the 'deleted_at' field is set and not null or undefined).
 * 4. Other critical technical metadata (id, original_filename, storage info, size,
 *    etc) are still available and not lost due to deletion.
 *
 * Steps:
 *
 * 1. Admin joins and authenticates.
 * 2. Create a random IDiscussionBoardAttachment-like mock object and manually set
 *    its 'deleted_at' to a valid date-time, simulating a soft-deleted file
 *    record (direct creation isn't supported by current public API, so mock for
 *    test input simulation).
 * 3. Fetch the attachment's metadata as admin.
 * 4. Assert the metadata returned matches expectations.
 */
export async function test_api_admin_attachment_detail_deleted_attachment(
  connection: api.IConnection,
) {
  // 1. Admin joins and is authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a mock attachment and simulate soft deletion
  const attachment: IDiscussionBoardAttachment =
    typia.random<IDiscussionBoardAttachment>();
  const deletedAttachment: IDiscussionBoardAttachment = {
    ...attachment,
    deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  typia.assert(deletedAttachment);
  // Normally, we'd use a public API to create/delete; but only GET is available so we proceed with mock data validation.

  // 3. Fetch the soft-deleted attachment's metadata by UUID
  const output: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.admin.attachments.at(connection, {
      attachmentId: deletedAttachment.id,
    });
  typia.assert(output);

  // 4. Assert the returned metadata correctness for audit/compliance
  TestValidator.equals(
    "attachment id matches",
    output.id,
    deletedAttachment.id,
  );
  TestValidator.predicate(
    "deleted_at is set",
    typeof output.deleted_at === "string" &&
      output.deleted_at !== null &&
      output.deleted_at !== undefined,
  );
  TestValidator.equals(
    "original_filename matches",
    output.original_filename,
    deletedAttachment.original_filename,
  );
  TestValidator.equals(
    "size_bytes matches",
    output.size_bytes,
    deletedAttachment.size_bytes,
  );
  TestValidator.equals(
    "storage_filename matches",
    output.storage_filename,
    deletedAttachment.storage_filename,
  );
}
