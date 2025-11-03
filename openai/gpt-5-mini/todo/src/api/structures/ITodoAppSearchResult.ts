import { tags } from "typia";

export namespace ITodoAppSearchResult {
  /**
   * Summary representation of a single search result returned by the platform
   * search endpoints.
   *
   * This type is deliberately a projection (read-only view) and is not a
   * direct one-to-one mapping to any single Prisma model. It contains
   * minimal, UI-friendly fields used by list and search APIs. Fields:
   *
   * - Id: UUID of the referenced entity.
   * - TargetType/targetId: Discriminator pair telling the client which domain
   *   entity the result represents ("list", "task", "user", "tag").
   * - Title/snippet: Display fields for preview.
   * - Href: Application navigation URL (presentation helper).
   * - Score: Numeric relevance produced by the search service.
   *
   * Clients MUST treat this object as a summary view and call the appropriate
   * detail endpoint (for example GET /lists/{id} or GET /tasks/{id}) when
   * full entity data is needed.
   */
  export type ISummary = {
    /**
     * Unique identifier for this search result record. When the result
     * represents an entity persisted in the database (for example a list or
     * a task), this is the UUID of that entity.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Denotes the kind of entity the search result refers to. Use this
     * discriminator to interpret the other fields and route clients to the
     * correct detail endpoint.
     */
    targetType: "list" | "task" | "user" | "tag";

    /**
     * The UUID of the referenced domain entity (todo_app_lists.id,
     * todo_app_tasks.id, todo_app_todouser.id, or todo_app_task_tags.id).
     * Clients should use targetType + targetId to construct navigation
     * links or subsequent API requests.
     */
    targetId: string & tags.Format<"uuid">;

    /**
     * Primary human-facing title for the search hit. For lists this is the
     * list.title; for tasks this is the task.title; for users this is the
     * user's display name or email; for tags this is the tag name.
     */
    title: string;

    /**
     * Short highlighted excerpt (plain text) demonstrating why this item
     * matched the query. This field is intended for UI preview and may
     * contain trimmed content.
     */
    snippet?: string | undefined;

    /**
     * Application-level href where the client may navigate to view the
     * referenced entity resource. This is a presentation helper and not a
     * required server-side canonical identifier.
     */
    href: string & tags.Format<"uri">;

    /**
     * Full-text relevance score (domain-specific). Higher values indicate
     * better match. This is an opaque numeric value produced by the search
     * service and intended for ordering.
     */
    score?: number | undefined;

    /**
     * Timestamp representing when the underlying entity
     * (list/task/user/tag) was created (ISO 8601 / RFC3339). Provided to
     * help clients present chronological context in search results.
     */
    createdAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional timestamp of last modification for the underlying entity
     * (ISO 8601 / RFC3339). Useful for sorting or rendering freshness
     * indicators.
     */
    updatedAt?: (string & tags.Format<"date-time">) | undefined;
  };
}
