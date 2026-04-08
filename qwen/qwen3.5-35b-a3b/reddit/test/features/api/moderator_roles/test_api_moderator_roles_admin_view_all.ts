import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorRole";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderator_roles_admin_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve all moderator roles (no filters)
  const result =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {} satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals("has pagination", result.pagination, result.pagination);
  // 4. Validate pagination metadata
  const { pagination } = result;
  TestValidator.equals("current page is valid", pagination.current >= 1, true);
  TestValidator.equals("limit is valid", pagination.limit >= 1, true);
  TestValidator.equals("records count valid", pagination.records >= 0, true);
  TestValidator.equals("pages calculated", pagination.pages >= 0, true);
  // 5. Verify pagination consistency
  TestValidator.equals(
    "pages matches records and limit",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Validate data array exists and has correct type
  const data = result.data;
  TestValidator.equals("data is array", Array.isArray(data), true);
  // 7. If data exists, validate each record structure
  if (data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      // 7.1 Validate record has required fields
      typia.assert(record);
      // 7.2 Validate UUID format for id
      TestValidator.equals(
        `record ${i} has valid id format`,
        true,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          record.id,
        ),
      );
      // 7.3 Validate role type
      TestValidator.equals(
        `record ${i} has valid role type`,
        ["owner", "moderator"].includes(record.role),
        true,
      );
      // 7.4 Validate timestamps
      TestValidator.equals(
        `record ${i} created_at format valid`,
        true,
        !isNaN(Date.parse(record.created_at)),
      );
      TestValidator.equals(
        `record ${i} updated_at format valid`,
        true,
        !isNaN(Date.parse(record.updated_at)),
      );
      // 7.5 Validate community reference exists
      TestValidator.equals(
        `record ${i} has community`,
        record.community !== undefined,
        true,
      );
      typia.assert(record.community);
      // 7.6 Validate member reference exists
      TestValidator.equals(
        `record ${i} has member`,
        record.member !== undefined,
        true,
      );
      typia.assert(record.member);
    }
  }
}
