import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_superadmin_section_image_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Upload an image to the section
  const image =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `test-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<3840>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2160>
          >(),
          image_type: RandomGenerator.pick([
            "banner",
            "icon",
            "promotional",
            "thumbnail",
          ] as const) as "banner" | "icon" | "promotional" | "thumbnail",
          storage_path: `/uploads/sections/${section.id}/${RandomGenerator.alphaNumeric(16)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(image);
  // 4. Delete the image
  await api.functional.discussionBoard.superAdmin.sections.images.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      imageId: image.id,
    },
  );
  // 5. Verify deletion by attempting to delete the same image again
  await TestValidator.httpError(
    "deleting already deleted image should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.erase(
        superAdminConnection,
        {
          sectionId: section.id,
          imageId: image.id,
        },
      );
    },
  );
}
