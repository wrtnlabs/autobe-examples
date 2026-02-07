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

export async function test_api_section_image_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a discussion board section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Upload an image to the section
  const image =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          image_type: RandomGenerator.pick([
            "banner",
            "icon",
            "promotional",
            "thumbnail",
          ] as const),
          storage_path: `/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(image);
  // Retrieve the image metadata - Since no utility function exists for this endpoint, use SDK directly
  const retrievedImage =
    await api.functional.discussionBoard.superAdmin.sections.images.at(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate image properties
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "filename matches",
    retrievedImage.filename,
    image.filename,
  );
  TestValidator.equals(
    "mime type matches",
    retrievedImage.mime_type,
    image.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    image.file_size,
  );
  TestValidator.equals("width matches", retrievedImage.width, image.width);
  TestValidator.equals("height matches", retrievedImage.height, image.height);
  TestValidator.equals(
    "image type matches",
    retrievedImage.image_type,
    image.image_type,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedImage.storage_path,
    image.storage_path,
  );
  TestValidator.equals(
    "alt text matches",
    retrievedImage.alt_text,
    image.alt_text,
  );
  // Validate section relationship
  TestValidator.equals(
    "section id matches",
    retrievedImage.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedImage.section.name,
    section.name,
  );
  TestValidator.equals(
    "section status matches",
    retrievedImage.section.status,
    section.status,
  );
  TestValidator.equals(
    "section display order matches",
    retrievedImage.section.display_order,
    section.display_order,
  );
  // Validate that the image belongs to the correct section
  TestValidator.predicate(
    "image belongs to correct section",
    retrievedImage.section.id === section.id &&
      retrievedImage.section.name === section.name,
  );
}
