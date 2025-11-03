import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPost";
import type { ICivicBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPostAttachment";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserSession";
import type { IECivicBoardAttachmentContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardAttachmentContentType";
import type { IECivicBoardContentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardContentStatus";
import type { IECivicBoardPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardPostStatus";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICivicBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICivicBoardPostAttachment";

export async function test_api_post_attachments_search_and_filter(
  connection: api.IConnection,
) {
  // 1) Member joins (no login). SDK will attach Authorization header automatically.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Pw_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    href: "https://app.example.com/" + RandomGenerator.alphabets(8),
    referrer: "",
  } satisfies ICivicBoardUser.ICreate;
  const authorized = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a post (Published by business rule on creation)
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
  } satisfies ICivicBoardPost.ICreate;
  const post: ICivicBoardPost =
    await api.functional.civicBoard.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 3) Upload multiple diverse attachments under the post
  type Spec = {
    filename: string;
    contentType: IECivicBoardAttachmentContentType;
    size: number;
    width?: number | null;
    height?: number | null;
    ext: string;
  };
  const specs: Spec[] = [
    {
      filename: `photo_${RandomGenerator.alphabets(6)}`,
      contentType: "image/jpeg",
      size: 125_000,
      width: 1024,
      height: 768,
      ext: ".jpg",
    },
    {
      filename: `scan_${RandomGenerator.alphabets(6)}`,
      contentType: "application/pdf",
      size: 980_000,
      width: null,
      height: null,
      ext: ".pdf",
    },
    {
      filename: `diagram_${RandomGenerator.alphabets(6)}`,
      contentType: "image/png",
      size: 240_000,
      width: 800,
      height: 600,
      ext: ".png",
    },
    {
      filename: `sheet_${RandomGenerator.alphabets(6)}`,
      contentType: "application/pdf",
      size: 2_400_000,
      width: null,
      height: null,
      ext: ".pdf",
    },
    {
      filename: `anim_${RandomGenerator.alphabets(6)}`,
      contentType: "image/gif",
      size: 540_000,
      width: 640,
      height: 480,
      ext: ".gif",
    },
    {
      filename: `photo_${RandomGenerator.alphabets(6)}`,
      contentType: "image/jpeg",
      size: 320_000,
      width: 1280,
      height: 720,
      ext: ".jpg",
    },
  ];

  const created: ICivicBoardPostAttachment[] = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const body = {
      uri: `https://files.example.com/${s.filename}${s.ext}`,
      original_filename: `${s.filename}${s.ext}`,
      content_type: s.contentType,
      byte_size: s.size,
      image_width: s.width ?? null,
      image_height: s.height ?? null,
    } satisfies ICivicBoardPostAttachment.ICreate;
    const att = await api.functional.civicBoard.user.posts.attachments.create(
      connection,
      { postId: post.id, body },
    );
    typia.assert(att);
    created.push(att);
  }

  // Build an unauthenticated connection to verify public access
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // Common helpers
  const idsOf = (rows: ICivicBoardPostAttachment.ISummary[]): string[] =>
    rows.map((r) => r.id);
  const ensureAllBelongToPost = (rows: ICivicBoardPostAttachment.ISummary[]) =>
    rows.every((r) => r.civic_board_post_id === post.id);

  // 4-A) Filter: images only (content_types) + sort by original_filename ASC
  const imageTypes: IECivicBoardAttachmentContentType[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
  ];
  const imagesExpected = created.filter((c) =>
    imageTypes.includes(c.content_type),
  );
  const listImages = await api.functional.civicBoard.posts.attachments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        content_types: imageTypes,
        order_by: "original_filename",
        order_direction: "asc",
        limit: 100,
        page: 1,
      } satisfies ICivicBoardPostAttachment.IRequest,
    },
  );
  typia.assert(listImages);

  TestValidator.predicate(
    "images-only filter returns only images",
    listImages.data.every((r) => imageTypes.includes(r.content_type)),
  );
  TestValidator.predicate(
    "all results belong to target post (images-only)",
    ensureAllBelongToPost(listImages.data),
  );
  // Ascending by original_filename
  TestValidator.predicate(
    "sorted by original_filename asc (images-only)",
    listImages.data.every(
      (r, i, a) => i === 0 || a[i - 1].original_filename <= r.original_filename,
    ),
  );
  // Ensure expected created images are present (limit=100 to avoid truncation)
  const returnedImageIds = new Set(idsOf(listImages.data));
  TestValidator.predicate(
    "all created image attachments are included in listing",
    imagesExpected.every((e) => returnedImageIds.has(e.id)),
  );

  // 4-B) Filter: original_filename_contains (case-insensitive)
  const targetForName = created[0];
  const needle = targetForName.original_filename.slice(
    1,
    Math.min(6, targetForName.original_filename.length),
  );
  const listByName = await api.functional.civicBoard.posts.attachments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        original_filename_contains: needle,
        order_by: "original_filename",
        order_direction: "asc",
        limit: 100,
        page: 1,
      } satisfies ICivicBoardPostAttachment.IRequest,
    },
  );
  typia.assert(listByName);

  TestValidator.predicate(
    "filename substring filter matches",
    listByName.data.every((r) =>
      r.original_filename.toLowerCase().includes(needle.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "all results belong to target post (name filter)",
    ensureAllBelongToPost(listByName.data),
  );

  // 4-C) Filter: byte_size range and sort by byte_size DESC
  const sizes = created.map((c) => c.byte_size).sort((a, b) => a - b);
  const byteMin = sizes.length >= 2 ? sizes[1] : sizes[0];
  const byteMax = sizes.length >= 2 ? sizes[sizes.length - 2] : sizes[0];
  const listBySize = await api.functional.civicBoard.posts.attachments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        byte_size_min: byteMin,
        byte_size_max: byteMax,
        order_by: "byte_size",
        order_direction: "desc",
        limit: 100,
        page: 1,
      } satisfies ICivicBoardPostAttachment.IRequest,
    },
  );
  typia.assert(listBySize);

  TestValidator.predicate(
    "byte_size range respected",
    listBySize.data.every(
      (r) => r.byte_size >= byteMin && r.byte_size <= byteMax,
    ),
  );
  TestValidator.predicate(
    "sorted by byte_size desc",
    listBySize.data.every(
      (r, i, a) => i === 0 || a[i - 1].byte_size >= r.byte_size,
    ),
  );
  TestValidator.predicate(
    "all results belong to target post (size filter)",
    ensureAllBelongToPost(listBySize.data),
  );

  // 4-D) Pagination stability: consistent ordering and non-overlap across pages
  const page1 = await api.functional.civicBoard.posts.attachments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        order_by: "original_filename",
        order_direction: "asc",
        limit: 2,
        page: 1,
      } satisfies ICivicBoardPostAttachment.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.civicBoard.posts.attachments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        order_by: "original_filename",
        order_direction: "asc",
        limit: 2,
        page: 2,
      } satisfies ICivicBoardPostAttachment.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.predicate(
    "no overlap between page 1 and page 2 (by original_filename asc)",
    page1.data.every((x) => page2.data.every((y) => y.id !== x.id)),
  );
  TestValidator.predicate(
    "ordered asc by original_filename across pages",
    [
      ...page1.data.map((r) => r.original_filename),
      ...page2.data.map((r) => r.original_filename),
    ].every((v, i, a) => i === 0 || a[i - 1] <= v),
  );
}
