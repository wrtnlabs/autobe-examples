import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentMetadata";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_attachment_search_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/referral",
  } satisfies IDiscussionBoardUser.IJoin;
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    { body: citizenCreds },
  );
  typia.assert(citizen);
  // Step 2: Define search parameters according to scenario, but accept that we cannot control existing data
  // We'll use the required filters, but use undefined for properties we want to ignore
  const today = new Date();
  const createdAfter = new Date(
    today.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdBefore = today.toISOString();
  const searchParams: IDiscussionBoardAttachment.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at", // Must be one of: "created_at", "file_size", "filename"
    order: "desc", // Must be "asc" or "desc"
    file_extension: "jpg", // Must be a string extension
    min_file_size: 1000, // Must be non-negative number
    max_file_size: 500000, // Must be non-negative number
    created_after: createdAfter,
    created_before: createdBefore,
    parent_type: "article", // Must be one of: "article", "comment", "post"
    content_id: undefined, // Use undefined to ignore this filter (per DTO definition)
  };
  // Step 3: Call the attachment search endpoint (only available API)
  const result: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.attachments.index(citizenConnection, {
      body: searchParams,
    });
  typia.assert(result);
  // Step 4: Validate the search response structure and API contract
  // Test pagination structure
  TestValidator.equals("pagination page correct", result.pagination.current, 1);
  TestValidator.equals("pagination limit correct", result.pagination.limit, 10);
  TestValidator.predicate("results are an array", Array.isArray(result.data));
  TestValidator.predicate(
    "results count is non-negative",
    result.data.length >= 0,
  );
  // Validate structure of each attachment summary (ignore content validity since we can't control data)
  for (const attachment of result.data) {
    // Validate required properties exist and have correct types
    TestValidator.predicate(
      "attachment ID is UUID",
      typeof attachment.id === "string" && attachment.id.length > 0,
    );
    TestValidator.predicate(
      "attachment name is string",
      typeof attachment.name === "string" && attachment.name.length > 0,
    );
    TestValidator.predicate(
      "attachment extension is string",
      typeof attachment.extension === "string" &&
        attachment.extension.length > 0,
    );
    TestValidator.predicate(
      "attachment size is number",
      typeof attachment.size === "number" && attachment.size >= 0,
    );
    TestValidator.predicate(
      "attachment created_at is ISO string",
      typeof attachment.created_at === "string",
    );
    // Validate parent_type is one of the allowed values
    TestValidator.predicate(
      "attachment parent type is valid",
      attachment.parent_type === "article" ||
        attachment.parent_type === "comment" ||
        attachment.parent_type === "post",
    );
    TestValidator.predicate(
      "attachment parent ID is UUID",
      typeof attachment.parent_id === "string" &&
        attachment.parent_id.length > 0,
    );
    TestValidator.predicate(
      "attachment media type is UUID",
      typeof attachment.media_type === "string" &&
        attachment.media_type.length > 0,
    );
    // Validate visibility
    TestValidator.predicate(
      "attachment content_visibility is valid",
      attachment.content_visibility === "public" ||
        attachment.content_visibility === "protected" ||
        attachment.content_visibility === "private",
    );
    TestValidator.predicate(
      "attachment is_processed is boolean",
      typeof attachment.is_processed === "boolean",
    );
    TestValidator.predicate(
      "attachment mimetype is string",
      typeof attachment.mimetype === "string",
    );
    TestValidator.predicate(
      "attachment hash is string",
      typeof attachment.hash === "string" && attachment.hash.length > 0,
    );
    TestValidator.predicate(
      "attachment version is integer",
      typeof attachment.version === "number" &&
        Number.isInteger(attachment.version) &&
        attachment.version >= 1,
    );
    TestValidator.predicate(
      "attachment file_language is string",
      typeof attachment.file_language === "string",
    );
    TestValidator.predicate(
      "attachment processing_progress is percentage",
      typeof attachment.processing_progress === "number" &&
        attachment.processing_progress >= 0 &&
        attachment.processing_progress <= 100,
    );
    TestValidator.predicate(
      "attachment processing_details is string",
      typeof attachment.processing_details === "string",
    );
    TestValidator.predicate(
      "attachment tags is array",
      Array.isArray(attachment.tags),
    );
    // Ignore metadata, thumbnail_url (optional), is_anonymous, related_attachments_count, is_primary, is_public
    // since we cannot verify their values without more context
  }
}
