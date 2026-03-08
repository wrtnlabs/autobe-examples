import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_administrator_request_rejection_with_review_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (the one who will request admin)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "12345678",
      displayName: typia.random<string>(),
      bio: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Register and login a super admin (the one who will reject)
  const adminEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email">;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: "12345678",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 3. Reject the administrator request with review notes
  const rejectionInput: IEconomicPoliticalBoardAdministratorRequest.IRejection =
    {
      review_notes:
        "Request lacks sufficient justification for administrative privileges. The applicant did not provide clear evidence of relevant experience or understanding of admin responsibilities.",
    } satisfies IEconomicPoliticalBoardAdministratorRequest.IRejection;
  const rejectionId = typia.random<string & tags.Format<"uuid">>();
  const rejectedRequest =
    await api.functional.economicPoliticalBoard.admin.pending_requests.reject(
      adminLoginConnection,
      {
        requestId: rejectionId,
        body: rejectionInput,
      },
    );
  typia.assert(rejectedRequest);
  // 4. Validate the rejection response
  TestValidator.equals(
    "request status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "review notes should match input",
    rejectedRequest.review_notes,
    rejectionInput.review_notes,
  );
  TestValidator.notEquals(
    "reviewed_at should be set",
    rejectedRequest.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "reviewed_by_admin should be set",
    rejectedRequest.reviewed_by_admin,
    null,
  );
}
