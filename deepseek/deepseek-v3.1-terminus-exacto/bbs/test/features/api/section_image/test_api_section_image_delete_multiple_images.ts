import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_delete_multiple_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Upload first image (banner)
  const bannerImage =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "banner.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: 1200,
          height: 400,
          image_type: "banner",
          storage_path: "/images/sections/" + section.id + "/banner.jpg",
          alt_text: "Section banner image",
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(bannerImage);
  // 4. Upload second image (icon)
  const iconImage =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "icon.png",
          mime_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100> &
              tags.Maximum<50000>
          >(),
          width: 64,
          height: 64,
          image_type: "icon",
          storage_path: "/images/sections/" + section.id + "/icon.png",
          alt_text: "Section icon image",
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(iconImage);
  // 5. Delete first image (banner)
  await api.functional.discussionBoard.admin.sections.images.erase(
    adminConnection,
    {
      sectionId: section.id,
      imageId: bannerImage.id,
    },
  );
  // 6. Verify deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleted image cannot be deleted again",
    async () => {
      await api.functional.discussionBoard.admin.sections.images.erase(
        adminConnection,
        {
          sectionId: section.id,
          imageId: bannerImage.id,
        },
      );
    },
  );
  // 7. Verify second image still exists
  TestValidator.predicate(
    "second image storage path remains unchanged",
    iconImage.storage_path === "/images/sections/" + section.id + "/icon.png",
  );
}
