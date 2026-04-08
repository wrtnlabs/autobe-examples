import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditClonePostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        link_url: true,
        image_url: true,
        snapshot_created_at: true,
      },
    } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostSnapshot.ISummary> {
    const preview = computePreview(input);
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      preview,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
    };
  }
  function computePreview(input: Payload): string | null {
    switch (input.post_type) {
      case "text": {
        if (!input.text_content) return null;
        if (input.text_content.length <= 200) return input.text_content;
        return input.text_content.substring(0, 200) + "...";
      }
      case "link": {
        if (!input.link_url) return null;
        try {
          const url = new URL(input.link_url);
          return url.hostname;
        } catch {
          return null;
        }
      }
      case "image": {
        return "Image";
      }
      default: {
        return null;
      }
    }
  }
}
