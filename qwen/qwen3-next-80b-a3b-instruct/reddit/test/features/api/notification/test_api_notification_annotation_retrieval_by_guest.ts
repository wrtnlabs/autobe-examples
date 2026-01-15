import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformNotificationAnnotation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotation";
import type { ICommunityPlatformNotificationAnnotationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotationMetadata";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_notification_annotation_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for guest authentication and join
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guestAuth);
  // Step 2: Generate a random, valid annotationId — simulating a system-generated annotation
  // As per business requirement: annotation is created by system events (not guest API)
  // We cannot create via guest API, so we assume it exists and test retrieval
  const annotationId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the annotation using the generated annotationId
  const retrievedAnnotation: ICommunityPlatformNotificationAnnotation =
    await api.functional.communityPlatform.guest.notification_annotations.at(
      guestConnection,
      {
        annotationId,
      },
    );
  typia.assert(retrievedAnnotation);
  // Step 4: Validate key properties from the retrieved data
  TestValidator.equals(
    "annotation ID matches request ID",
    retrievedAnnotation.id,
    annotationId,
  );
  TestValidator.predicate(
    "annotation has valid type",
    typeof retrievedAnnotation.type === "string" &&
      retrievedAnnotation.type.length > 0,
  );
  TestValidator.predicate(
    "annotation has valid target_id",
    retrievedAnnotation.target_id !== null &&
      typeof retrievedAnnotation.target_id === "string" &&
      retrievedAnnotation.target_id.length === 36,
  );
  TestValidator.predicate(
    "annotation has valid created_at",
    typeof retrievedAnnotation.created_at === "string" &&
      new Date(retrievedAnnotation.created_at).toISOString() ===
        retrievedAnnotation.created_at,
  );
  TestValidator.predicate(
    "annotation has valid status",
    ["active", "resolved", "ignored", "escalated"].includes(
      retrievedAnnotation.status,
    ),
  );
  // Validate optional fields: should be either correct type or undefined/null as per schema
  if (retrievedAnnotation.annotator_type !== undefined) {
    TestValidator.predicate(
      "annotator_type is valid string",
      typeof retrievedAnnotation.annotator_type === "string",
    );
  }
  if (retrievedAnnotation.annotator_id !== undefined) {
    TestValidator.predicate(
      "annotator_id is a valid UUID",
      typeof retrievedAnnotation.annotator_id === "string" &&
        retrievedAnnotation.annotator_id.length === 36,
    );
  }
  if (retrievedAnnotation.category !== undefined) {
    TestValidator.predicate(
      "category is a valid string",
      typeof retrievedAnnotation.category === "string",
    );
  }
  if (retrievedAnnotation.severity_score !== undefined) {
    TestValidator.predicate(
      "severity_score is a number between 0 and 10",
      typeof retrievedAnnotation.severity_score === "number" &&
        retrievedAnnotation.severity_score >= 0 &&
        retrievedAnnotation.severity_score <= 10,
    );
  }
  if (retrievedAnnotation.context !== undefined) {
    TestValidator.predicate(
      "context is a valid string",
      typeof retrievedAnnotation.context === "string",
    );
  }
  if (retrievedAnnotation.tags !== undefined) {
    TestValidator.predicate(
      "tags is an array of strings",
      Array.isArray(retrievedAnnotation.tags) &&
        retrievedAnnotation.tags.every((tag) => typeof tag === "string"),
    );
  }
  if (retrievedAnnotation.related_reports !== undefined) {
    TestValidator.predicate(
      "related_reports is an array of valid UUIDs",
      Array.isArray(retrievedAnnotation.related_reports) &&
        retrievedAnnotation.related_reports.every(
          (id) => typeof id === "string" && id.length === 36,
        ),
    );
  }
  if (retrievedAnnotation.metadata !== undefined) {
    // According to definition: ICommunityPlatformNotificationAnnotationMetadata = string
    TestValidator.predicate(
      "metadata is a valid string",
      typeof retrievedAnnotation.metadata === "string",
    );
  }
}
