import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostVotes(props: {
  member: MemberPayload;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<IPageICommunityPlatformPostVote.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    community_platform_member_id: props.member.id,
    ...(props.body.direction !== undefined
      ? {
          direction: props.body.direction,
        }
      : {}),
    ...(props.body.includeDeleted === true
      ? {}
      : {
          deleted_at: null,
        }),
    ...(props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdFrom !== undefined
              ? {
                  gte: props.body.createdFrom,
                }
              : {}),
            ...(props.body.createdTo !== undefined
              ? {
                  lte: props.body.createdTo,
                }
              : {}),
          },
        }
      : {}),
    ...(props.body.updatedFrom !== undefined ||
    props.body.updatedTo !== undefined
      ? {
          updated_at: {
            ...(props.body.updatedFrom !== undefined
              ? {
                  gte: props.body.updatedFrom,
                }
              : {}),
            ...(props.body.updatedTo !== undefined
              ? {
                  lte: props.body.updatedTo,
                }
              : {}),
          },
        }
      : {}),
    ...(props.body.postIds !== undefined && props.body.postIds.length !== 0
      ? {
          community_platform_post_id: {
            in: props.body.postIds,
          },
        }
      : {}),
  } satisfies Prisma.community_platform_post_votesWhereInput;
  const orderByInput: Prisma.community_platform_post_votesOrderByWithRelationInput[] =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? [{ created_at: "desc" }, { id: "desc" }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "updated_at_desc"
          ? [{ updated_at: "desc" }, { id: "desc" }]
          : props.body.sort === "updated_at_asc"
            ? [{ updated_at: "asc" }, { id: "asc" }]
            : (() => {
                throw new HttpException("Unsupported sort key", 400);
              })();
  const data = await MyGlobal.prisma.community_platform_post_votes.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: {
        select: {
          id: true,
          title: true,
          post_type: true,
          status: true,
          author: {
            select: {
              id: true,
              code: true,
              email: true,
              email_verified: true,
              status: true,
              last_signed_in_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          community: {
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              status: true,
              member: {
                select: {
                  id: true,
                  code: true,
                  email: true,
                  email_verified: true,
                  status: true,
                  last_signed_in_at: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              subscriptions: {
                select: {
                  id: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          votes: {
            select: {
              direction: true,
              deleted_at: true,
            },
          },
          comments: {
            select: {
              deleted_at: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  } satisfies Prisma.community_platform_post_votesFindManyArgs);
  const total = await MyGlobal.prisma.community_platform_post_votes.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((vote) => ({
      id: vote.id,
      direction: vote.direction,
      post: {
        id: vote.post.id,
        title: vote.post.title,
        post_type: vote.post.post_type,
        status: vote.post.status,
        author: {
          id: vote.post.author.id,
          code: vote.post.author.code,
          email: vote.post.author.email,
          email_verified: vote.post.author.email_verified,
          status: vote.post.author.status,
          last_signed_in_at:
            vote.post.author.last_signed_in_at !== null
              ? toISOStringSafe(vote.post.author.last_signed_in_at)
              : null,
          created_at: toISOStringSafe(vote.post.author.created_at),
          updated_at: toISOStringSafe(vote.post.author.updated_at),
          deleted_at:
            vote.post.author.deleted_at !== null
              ? toISOStringSafe(vote.post.author.deleted_at)
              : null,
        } satisfies ICommunityPlatformMember.ISummary,
        community: {
          id: vote.post.community.id,
          slug: vote.post.community.slug,
          title: vote.post.community.title,
          description: vote.post.community.description,
          status: vote.post.community.status,
          member: {
            id: vote.post.community.member.id,
            code: vote.post.community.member.code,
            email: vote.post.community.member.email,
            email_verified: vote.post.community.member.email_verified,
            status: vote.post.community.member.status,
            last_signed_in_at:
              vote.post.community.member.last_signed_in_at !== null
                ? toISOStringSafe(vote.post.community.member.last_signed_in_at)
                : null,
            created_at: toISOStringSafe(vote.post.community.member.created_at),
            updated_at: toISOStringSafe(vote.post.community.member.updated_at),
            deleted_at:
              vote.post.community.member.deleted_at !== null
                ? toISOStringSafe(vote.post.community.member.deleted_at)
                : null,
          } satisfies ICommunityPlatformMember.ISummary,
          subscriber_count: vote.post.community.subscriptions.length,
          created_at: toISOStringSafe(vote.post.community.created_at),
          updated_at: toISOStringSafe(vote.post.community.updated_at),
          deleted_at:
            vote.post.community.deleted_at !== null
              ? toISOStringSafe(vote.post.community.deleted_at)
              : null,
        } satisfies ICommunityPlatformCommunity.ISummary,
        vote_count: vote.post.votes.reduce(
          (
            accumulator: number,
            postVote: {
              direction: string;
              deleted_at: unknown | null;
            },
          ) => {
            if (postVote.deleted_at !== null) return accumulator;
            if (postVote.direction === "upvote") return accumulator + 1;
            if (postVote.direction === "downvote") return accumulator - 1;
            return accumulator;
          },
          0,
        ),
        comment_count: vote.post.comments.filter(
          (comment: { deleted_at: unknown | null }) =>
            comment.deleted_at === null,
        ).length,
        created_at: toISOStringSafe(vote.post.created_at),
        updated_at: toISOStringSafe(vote.post.updated_at),
        deleted_at:
          vote.post.deleted_at !== null
            ? toISOStringSafe(vote.post.deleted_at)
            : null,
      } satisfies ICommunityPlatformPost.ISummary,
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
      deleted_at:
        vote.deleted_at !== null ? toISOStringSafe(vote.deleted_at) : null,
    })),
  };
}
