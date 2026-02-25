import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_images_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create sections
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Test scenario 1: Retrieve images with no filters
  const allImages =
    await api.functional.discussionBoard.admin.sections.images.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(allImages);
  TestValidator.predicate(
    "pagination structure exists",
    allImages.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(allImages.data));
  // Test scenario 2: Filter by specific image_type
  const filteredImages =
    await api.functional.discussionBoard.admin.sections.images.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          image_type: "banner",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(filteredImages);
  // Test scenario 3: Text search across filename/alt_text
  const searchImages =
    await api.functional.discussionBoard.admin.sections.images.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(searchImages);
  // Test scenario 4: Combined filter with pagination
  const paginatedImages =
    await api.functional.discussionBoard.admin.sections.images.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          image_type: "banner",
          search: "logo",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(paginatedImages);
}
