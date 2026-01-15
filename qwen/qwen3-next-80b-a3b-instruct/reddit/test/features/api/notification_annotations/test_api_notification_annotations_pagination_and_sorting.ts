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
export async function test_api_notification_annotations_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin user to access notification annotations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Get basic information about the notification annotations dataset with a valid IRequest body
  const initialResponse: IPageICommunityPlatformNotificationAnnotation =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          type: "notification",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          status: "active",
          created_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(initialResponse);
  // Validate that response structure is correct
  TestValidator.predicate(
    "response contains pagination and data properties",
    initialResponse.pagination !== undefined &&
      initialResponse.data !== undefined,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    initialResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default value",
    initialResponse.pagination.limit,
    10, // assuming default limit of 10
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    initialResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    initialResponse.pagination.pages >= 0,
  );
  // Validate data length
  if (initialResponse.pagination.records === 0) {
    TestValidator.equals(
      "data length is 0 when there are no records",
      initialResponse.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "data length is at most default limit",
      initialResponse.data.length <= 10,
    );
    TestValidator.predicate(
      "data length is at least 0",
      initialResponse.data.length >= 0,
    );
  }
  // Validate default sorting by created_at ascending
  // Since we cannot control sort order, we verify that the default is ascending
  for (let i = 0; i < initialResponse.data.length - 1; i++) {
    const currDate = new Date(initialResponse.data[i].created_at);
    const nextDate = new Date(initialResponse.data[i + 1].created_at);
    TestValidator.predicate(
      "created_at is sorted ascending by default",
      currDate.getTime() <= nextDate.getTime(),
    );
  }
}
