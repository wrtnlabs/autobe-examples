import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"] as const),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random admin request ID
  const adminRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the admin request
  const request = await api.functional.discussionBoard.admin.admin_requests.at(
    adminConnection,
    {
      adminRequestId,
    },
  );
  typia.assert(request);
  // 4. Validate business logic - reason exists
  TestValidator.predicate("reason exists", request.reason.length > 0);
  // 5. Validate business logic - status is valid
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(request.status),
  );
  // 6. Validate member information exists
  TestValidator.predicate(
    "member has display name",
    request.member.display_name.length > 0,
  );
  // 7. Validate reviewer field based on status
  if (request.status === "pending") {
    TestValidator.equals(
      "reviewer is null for pending request",
      request.reviewer,
      null,
    );
  } else {
    // For approved or rejected, reviewer should exist
    TestValidator.predicate(
      "reviewer exists for non-pending request",
      request.reviewer !== null,
    );
    // Narrow the type after null check
    if (request.reviewer !== null) {
      typia.assert(request.reviewer);
      TestValidator.predicate(
        "reviewer has display name",
        request.reviewer.display_name.length > 0,
      );
    }
  }
  // 8. Validate soft delete filter (deleted_at should be null for active records)
  TestValidator.equals(
    "deleted_at is null for active request",
    request.deleted_at,
    null,
  );
}
