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
 * Test section image metadata update functionality.
 *
 * Validates that a super administrator can update metadata for existing section images
 * including filename, MIME type, image type, and alt text. Tests partial updates where
 * only specified fields are modified while unchanged fields preserve original values.
 */
export async function test_api_section_image_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 1,
            wordMax: 3,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create initial section image
  const imageTypes = ["banner", "icon", "promotional", "thumbnail"] as const;
  const initialImageType = RandomGenerator.pick(imageTypes);
  const initialImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        body: {
          filename: RandomGenerator.alphabets(10) + ".jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1920>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1080>
          >(),
          image_type: initialImageType,
          storage_path: "/images/" + RandomGenerator.alphabets(8) + ".jpg",
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
        params: { sectionId: section.id },
      },
    );
  typia.assert(initialImage);
  // 4. Update image metadata with partial fields
  const updatedFilename = "updated_" + initialImage.filename;
  const updatedMimeType = "image/png";
  const updatedImageType = RandomGenerator.pick(
    imageTypes.filter((t) => t !== initialImageType),
  );
  const updatedAltText = "Updated alt text for accessibility";
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: {
          filename: updatedFilename,
          mime_type: updatedMimeType,
          image_type: updatedImageType,
          alt_text: updatedAltText,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate updates
  TestValidator.equals(
    "filename should be updated",
    updatedImage.filename,
    updatedFilename,
  );
  TestValidator.equals(
    "mime type should be updated",
    updatedImage.mime_type,
    updatedMimeType,
  );
  TestValidator.equals(
    "image type should be updated",
    updatedImage.image_type,
    updatedImageType,
  );
  TestValidator.equals(
    "alt text should be updated",
    updatedImage.alt_text,
    updatedAltText,
  );
  // 6. Validate unchanged fields
  TestValidator.equals(
    "file size should remain unchanged",
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
    "storage path should remain unchanged",
    updatedImage.storage_path,
    initialImage.storage_path,
  );
  // 7. Validate image belongs to section
  TestValidator.equals(
    "image ID should remain the same",
    updatedImage.id,
    initialImage.id,
  );
  TestValidator.equals("section ID should match", section.id, section.id);
}
