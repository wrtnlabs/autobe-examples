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

/**
 * Test the successful update of section image metadata including filename, MIME type, image type, and accessibility text.
 * Verify that system-managed fields (id, file_size, width, height, storage_path) are preserved and not modifiable.
 * Validate that the updated image metadata is correctly returned in the response with all fields populated.
 * Ensure the image remains associated with the correct section after the update.
 */
export async function test_api_section_image_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create initial section image
  const initialImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          filename: RandomGenerator.alphabets(10) + ".jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >() satisfies number as number,
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >() satisfies number as number,
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >() satisfies number as number,
          image_type: "banner" as const,
          storage_path: "/images/" + RandomGenerator.alphabets(20) + ".jpg",
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // 4. Update image metadata
  const updateData = {
    filename: RandomGenerator.alphabets(12) + ".png",
    mime_type: "image/png",
    image_type: "promotional" as const,
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardSectionImage.IUpdate;
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: updateData,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate that system-managed fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedImage.id,
    initialImage.id,
  );
  TestValidator.equals(
    "file_size should remain unchanged",
    updatedImage.file_size,
    initialImage.file_size,
  );
  TestValidator.equals(
    "width should remain unchanged",
    updatedImage.width,
    initialImage.width,
  );
  TestValidator.equals(
    "height should remain unchanged",
    updatedImage.height,
    initialImage.height,
  );
  TestValidator.equals(
    "storage_path should remain unchanged",
    updatedImage.storage_path,
    initialImage.storage_path,
  );
  // 6. Validate that updated fields are correctly set
  TestValidator.equals(
    "filename should be updated",
    updatedImage.filename,
    updateData.filename,
  );
  TestValidator.equals(
    "mime_type should be updated",
    updatedImage.mime_type,
    updateData.mime_type,
  );
  TestValidator.equals(
    "image_type should be updated",
    updatedImage.image_type,
    updateData.image_type,
  );
  TestValidator.equals(
    "alt_text should be updated",
    updatedImage.alt_text,
    updateData.alt_text,
  );
  // 7. Validate that section association remains correct
  TestValidator.equals(
    "section id should remain unchanged",
    updatedImage.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name should remain unchanged",
    updatedImage.section.name,
    section.name,
  );
  TestValidator.equals(
    "section status should remain unchanged",
    updatedImage.section.status,
    section.status,
  );
  TestValidator.equals(
    "section display_order should remain unchanged",
    updatedImage.section.display_order,
    section.display_order,
  );
}
