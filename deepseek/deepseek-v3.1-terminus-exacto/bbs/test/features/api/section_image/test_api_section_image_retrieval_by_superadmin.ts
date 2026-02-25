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
 * Test: Super administrator creates a new section, uploads a banner image with detailed metadata,
 * then retrieves the image to verify all metadata is correctly persisted and accessible.
 * Validates the complete IDiscussionBoardSection.Image schema fields including nullable alt_text.
 * Demonstrates proper administrative image management workflow with super admin privileges.
 */
export async function test_api_section_image_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a section to contain the image
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {},
    );
  typia.assert(section);
  // 3. Upload an image to the section with specific metadata
  const imageCreateBody = {
    filename: RandomGenerator.alphabets(10) + ".png",
    mime_type: "image/png",
    file_size: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<10000000>
    >(),
    width: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<3000>
    >(),
    image_type: "banner" as const,
    storage_path:
      "images/sections/" + RandomGenerator.alphabets(8) + "/banner.png",
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardSectionImage.ICreate;
  const uploadedImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: imageCreateBody,
      },
    );
  typia.assert(uploadedImage);
  // 4. Retrieve the image using the GET endpoint
  const retrievedImage =
    await api.functional.discussionBoard.superAdmin.sections.images.at(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 5. Validate all image metadata matches exactly
  TestValidator.equals("ID should match", retrievedImage.id, uploadedImage.id);
  TestValidator.equals(
    "Filename should match",
    retrievedImage.filename,
    uploadedImage.filename,
  );
  TestValidator.equals(
    "MIME type should match",
    retrievedImage.mime_type,
    uploadedImage.mime_type,
  );
  TestValidator.equals(
    "File size should match",
    retrievedImage.file_size,
    uploadedImage.file_size,
  );
  TestValidator.equals(
    "Width should match",
    retrievedImage.width,
    uploadedImage.width,
  );
  TestValidator.equals(
    "Height should match",
    retrievedImage.height,
    uploadedImage.height,
  );
  TestValidator.equals(
    "Image type should match",
    retrievedImage.image_type,
    uploadedImage.image_type,
  );
  TestValidator.equals(
    "Storage path should match",
    retrievedImage.storage_path,
    uploadedImage.storage_path,
  );
  TestValidator.equals(
    "Alt text should match",
    retrievedImage.alt_text,
    uploadedImage.alt_text,
  );
}