import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationAnnotation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotation";
import type { ICommunityPlatformNotificationAnnotationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotationMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationAnnotation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationAnnotation";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_annotations_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create test annotations with different statuses to have data for filtering
  const testAnnotations = [];
  const statuses: ("active" | "resolved" | "ignored" | "escalated")[] = [
    "active",
    "resolved",
    "ignored",
    "escalated",
  ];
  for (const status of statuses) {
    const annotation =
      await api.functional.communityPlatform.admin.notification_annotations.index(
        adminConnection,
        {
          body: {
            id: typia.random<string & tags.Format<"uuid">>(),
            type: RandomGenerator.name(),
            target_id: typia.random<string & tags.Format<"uuid">>(),
            status: status,
            created_at: new Date().toISOString(),
          } satisfies ICommunityPlatformNotificationAnnotation.IRequest,
        },
      );
    testAnnotations.push(annotation);
  }
  // Fetch all to ensure records are created
  const results =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          type: RandomGenerator.name(),
          target_id: typia.random<string & tags.Format<"uuid">>(),
          status: "active" as const,
          created_at: new Date().toISOString(),
        } satisfies ICommunityPlatformNotificationAnnotation.IRequest,
      },
    );
  // Validate response structure
  typia.assert(results);
  // Verify pagination metadata is present and correct
  TestValidator.equals(
    "pagination exists",
    typeof results.pagination,
    "object",
  );
  TestValidator.predicate("current page >= 0", results.pagination.current >= 0);
  TestValidator.predicate("limit > 0", results.pagination.limit > 0);
  TestValidator.predicate("records >= 0", results.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", results.pagination.pages >= 0);
  // Verify all annotations have required properties
  results.data.forEach((annotation) => {
    TestValidator.equals(
      "annotation has valid id",
      typeof annotation.id,
      "string",
    );
    TestValidator.equals(
      "annotation has valid target_id",
      typeof annotation.target_id,
      "string",
    );
    TestValidator.equals(
      "annotation has valid created_at",
      typeof annotation.created_at,
      "string",
    );
    TestValidator.predicate(
      "annotation has valid status",
      ["active", "resolved", "ignored", "escalated"].includes(
        annotation.status,
      ),
    );
    // Validate status type
    TestValidator.equals(
      "status is enumerated type",
      typeof annotation.status,
      "string",
    );
    // Validate type property
    TestValidator.equals("type is string", typeof annotation.type, "string");
    // Validate annotator_type and annotator_id are either strings or undefined
    TestValidator.predicate(
      "annotator_type is string or undefined",
      annotation.annotator_type === undefined ||
        typeof annotation.annotator_type === "string",
    );
    TestValidator.predicate(
      "annotator_id is string or undefined",
      annotation.annotator_id === undefined ||
        typeof annotation.annotator_id === "string",
    );
    // Validate category is string or undefined
    TestValidator.predicate(
      "category is string or undefined",
      annotation.category === undefined ||
        typeof annotation.category === "string",
    );
    // Validate severity_score is number or undefined
    TestValidator.predicate(
      "severity_score is number or undefined",
      annotation.severity_score === undefined ||
        typeof annotation.severity_score === "number",
    );
    // Validate context is string or undefined
    TestValidator.predicate(
      "context is string or undefined",
      annotation.context === undefined ||
        typeof annotation.context === "string",
    );
    // Validate tags is array or undefined
    TestValidator.predicate(
      "tags is array or undefined",
      annotation.tags === undefined || Array.isArray(annotation.tags),
    );
    // Validate related_reports is array or undefined
    TestValidator.predicate(
      "related_reports is array or undefined",
      annotation.related_reports === undefined ||
        Array.isArray(annotation.related_reports),
    );
    // Validate metadata is object or undefined
    TestValidator.predicate(
      "metadata is object or undefined",
      annotation.metadata === undefined ||
        typeof annotation.metadata === "object",
    );
  });
  // Now test filtering by status - use the status field in IRequest
  for (const targetStatus of statuses) {
    // Create a request with specific status to filter by
    const filteredResults =
      await api.functional.communityPlatform.admin.notification_annotations.index(
        adminConnection,
        {
          body: {
            id: typia.random<string & tags.Format<"uuid">>(),
            type: RandomGenerator.name(),
            target_id: typia.random<string & tags.Format<"uuid">>(),
            status: targetStatus,
            created_at: new Date().toISOString(),
          } satisfies ICommunityPlatformNotificationAnnotation.IRequest,
        },
      );
    typia.assert(filteredResults);
    // Verify all results match the filtered status
    filteredResults.data.forEach((annotation) => {
      TestValidator.equals(
        "filtered annotation has correct status",
        annotation.status,
        targetStatus,
      );
    });
  }
}
