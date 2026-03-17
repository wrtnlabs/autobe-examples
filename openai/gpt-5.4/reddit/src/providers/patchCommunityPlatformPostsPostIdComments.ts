import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const sort = props.body.sort ?? "best";
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null || post.status !== "active") {
    throw new HttpException("Post is unavailable", 404);
  }
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      parent_id: true,
      created_at: true,
    },
  });
  const votes =
    comments.length === 0
      ? []
      : await MyGlobal.prisma.community_platform_comment_votes.findMany({
          where: {
            community_platform_comment_id: {
              in: comments.map((comment) => comment.id),
            },
            deleted_at: null,
          },
          select: {
            community_platform_comment_id: true,
            direction: true,
          },
        });
  const scoreMap = new Map<
    string,
    {
      score: number;
      activity: number;
    }
  >();
  for (const comment of comments) {
    scoreMap.set(comment.id, { score: 0, activity: 0 });
  }
  for (const vote of votes) {
    const current = scoreMap.get(vote.community_platform_comment_id);
    if (current !== undefined) {
      scoreMap.set(vote.community_platform_comment_id, {
        score:
          current.score +
          (vote.direction === "upvote"
            ? 1
            : vote.direction === "downvote"
              ? -1
              : 0),
        activity: current.activity + 1,
      });
    }
  }
  type Node = {
    id: string;
    parentId: string | null;
    created_at: string & tags.Format<"date-time">;
    children: Node[];
  };
  const nodeMap = new Map<string, Node>();
  for (const comment of comments) {
    nodeMap.set(comment.id, {
      id: comment.id,
      parentId: comment.parent_id,
      created_at: comment.created_at.toISOString(),
      children: [],
    });
  }
  const roots: Node[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId === null) {
      roots.push(node);
      continue;
    }
    const parent = nodeMap.get(node.parentId);
    if (parent === undefined) {
      roots.push(node);
      continue;
    }
    parent.children.push(node);
  }
  const compare = (x: Node, y: Node): number => {
    if (sort === "new") {
      return y.created_at.localeCompare(x.created_at);
    }
    const xMetric = scoreMap.get(x.id) ?? { score: 0, activity: 0 };
    const yMetric = scoreMap.get(y.id) ?? { score: 0, activity: 0 };
    if (sort === "controversial") {
      if (yMetric.activity !== xMetric.activity) {
        return yMetric.activity - xMetric.activity;
      }
      if (Math.abs(xMetric.score) !== Math.abs(yMetric.score)) {
        return Math.abs(xMetric.score) - Math.abs(yMetric.score);
      }
      return y.created_at.localeCompare(x.created_at);
    }
    if (yMetric.score !== xMetric.score) {
      return yMetric.score - xMetric.score;
    }
    if (yMetric.activity !== xMetric.activity) {
      return yMetric.activity - xMetric.activity;
    }
    return y.created_at.localeCompare(x.created_at);
  };
  const sortTree = (items: Node[]): void => {
    items.sort(compare);
    for (const item of items) {
      sortTree(item.children);
    }
  };
  sortTree(roots);
  const skip = (page - 1) * limit;
  const pagedRoots = roots.slice(skip, skip + limit);
  const data: ICommunityPlatformComment[] = [];
  const collect = (node: Node): void => {
    data.push({});
    for (const child of node.children) {
      collect(child);
    }
  };
  for (const root of pagedRoots) {
    collect(root);
  }
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: roots.length,
      pages: Math.ceil(roots.length / limit),
    } satisfies IPage.IPagination,
  };
}
