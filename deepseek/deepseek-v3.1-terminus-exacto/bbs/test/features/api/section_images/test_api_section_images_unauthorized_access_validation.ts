import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_section_images_unauthorized_access_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create regular user connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  userConnection.headers = { Authorization: userAuth.token.access };
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  superAdminConnection.headers = { Authorization: adminAuth.token.access };
  const invalidSectionId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Regular user unauthorized access
  await TestValidator.error(
    "regular user should not access section images",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.index(
        userConnection,
        {
          sectionId: invalidSectionId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    },
  );
  // Test 2: Invalid section ID - 404 error
  await TestValidator.error(
    "invalid section ID should return 404",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.index(
        superAdminConnection,
        {
          sectionId: invalidSectionId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    },
  );
  // Test 3: Negative page number validation
  await TestValidator.error(
    "negative page number should be invalid",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.index(
        superAdminConnection,
        {
          sectionId: invalidSectionId,
          body: {
            page: -1,
            limit: 10,
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    },
  );
  // Test 4: Excessive limit beyond maximum allowed
  await TestValidator.error(
    "limit beyond maximum should be invalid",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.index(
        superAdminConnection,
        {
          sectionId: invalidSectionId,
          body: {
            page: 1,
            limit: 101,
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    },
  );
  // Test 5: Zero limit validation
  await TestValidator.error("zero limit should be invalid", async () => {
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: invalidSectionId,
        body: {
          page: 1,
          limit: 0,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  });
  // Test 6: Valid request with super admin access
  await TestValidator.error(
    "valid request should still fail with invalid section",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.index(
        superAdminConnection,
        {
          sectionId: invalidSectionId,
          body: {
            page: 1,
            limit: 25,
            search: "test",
            image_type: "banner",
          } satisfies IDiscussionBoardSectionImage.IRequest,
        },
      );
    },
  );
}
