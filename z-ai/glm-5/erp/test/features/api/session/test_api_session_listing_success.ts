import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Call sessions endpoint with pagination
  const response = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    response.pagination.pages >= 0,
  );
  // Validate sessions are sorted by created_at in descending order
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prev = new Date(response.data[i - 1].created_at);
      const curr = new Date(response.data[i].created_at);
      TestValidator.predicate(
        "sessions sorted descending by created_at",
        prev >= curr,
      );
    }
  }
}
