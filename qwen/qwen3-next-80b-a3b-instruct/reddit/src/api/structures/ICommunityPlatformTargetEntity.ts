import { tags } from "typia";

export namespace ICommunityPlatformTargetEntity {
  /**
   * Summary representation of a target entity referenced in notification
   * events.
   *
   * This DTO type provides a lightweight, contextual summary of an entity
   * that triggered a notification event. It allows notification systems to
   * display meaningful context about what the notification relates to without
   * requiring an additional API call to retrieve the full entity details.
   *
   * Designed for efficient use in notification lists, feeds, and read status
   * tracking, this summary includes only essential information needed for
   * user comprehension:
   *
   * - Unique identifier for direct access
   * - Entity type for categorization
   * - Display name for immediate understanding
   * - Access url for direct linking
   * - Visual image for enhanced presentation
   * - Category for grouping
   * - Status to indicate accessibility
   *
   * All fields are populated from the triggering context and designed for
   * immediate use in UI components. This summary type ensures notifications
   * remain performant and context-rich without coupling to full entity
   * loading.
   */
  export type ISummary = {
    /**
     * Unique identifier for the target entity.
     *
     * Each target entity has a globally unique UUID identifier that is
     * assigned at creation and remains immutable throughout its lifecycle.
     * This ID serves as the primary key for all relationships involving
     * this entity and is used for direct retrieval.
     *
     * This UUID is used across the notification system to link to the
     * target entity in the database and ensure precise referencing
     * regardless of entity type. It is always required for accurate
     * notification context and is immutable once assigned.
     *
     * Cannot be null or undefined - present in ALL instances of this schema
     * as a primary identifier.
     *
     * Example: "b5e2a7f6-1c9a-4d2e-8a13-9e7f5c2d8f4f".
     *
     * MUST follow RFC 4122 UUID format for standardization, consistency,
     * and compatibility with all backend systems storing entity
     * references.
     *
     * HAS NO DEFAULT VALUE - always provided during creation of target
     * entity reference.
     *
     * CONFLICTS IF INCORRECT: Incorrect UUID format or malformed value will
     * cause targeting failures and 500 errors in linked entity retrieval
     * services.
     *
     * FAILURE MODE: If this field is missing or invalid, the notification
     * becomes non-functional as the target cannot be located.
     *
     * TRUSTED SOURCE: Generated and validated by the notification service
     * at event creation time based on actual target entity ID from
     * database. NEVER provided by clients.
     *
     * - Format: UUID
     * - Constraint: UUID format validation
     * - Database reference: symlink to target entity lookup table
     * - DB Presence: Primary key - always present
     * - Validation: REQUIRED
     *
     * Latest JSON Schema Spec Reference:
     * https://json-schema.org/draft/2020-12/json-schema-validation.html#name-uuid-format
     *
     * Example value: "b5e2a7f6-1c9a-4d2e-8a13-9e7f5c2d8f4f".
     *
     * Format boundary: Exactly 36 characters with four hyphens in standard
     * UUID format (8-4-4-4-12).
     *
     * Background Reference: The UUID format ensures unique identifiers
     * across distributed systems.
     *
     * Development Context: Used in internal API contracts and microservice
     * communication to identify target entities.
     *
     * In production, this field is generated from primary keys in the
     * target entity tables, with a 128-bit key generation.
     *
     * System Runtime Signature: Persistent entity lookup reference.
     *
     * Failure Risk: High - critical path field. Error in UUID will break
     * notification linking entirely.
     *
     * Data Type: string. Must be a valid UUID string.
     *
     * Match Database Column: Target entity ID field.
     *
     * Value Range: Only valid RFC 4122 UUID format strings permitted.
     *
     * Security Implications: Exposure of internal entity IDs in public APIs
     * requires framework-level protections to prevent enumeration.
     *
     * API Usage Example: A notification target with ID
     * "f7a2c1e8-4d9f-4b82-9e1a-6c4f2e1d6b3c" links directly to an entity in
     * the system with the same ID in its database.
     *
     * Minimum Length: 36 characters.
     *
     * Maximum Length: 36 characters.
     *
     * Minimum Value (numeric): Not applicable - string type.
     *
     * Maximum Value (numeric): Not applicable - string type.
     *
     * Min Length: 36.
     *
     * Max Length: 36.
     *
     * Format: "uuid".
     *
     * Pattern:
     * "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$".
     *
     * Example Value: "b5e2a7f6-1c9a-4d2e-8a13-9e7f5c2d8f4f".
     *
     * Validation Method: Native "uuid" format validation.
     *
     * Value Domain: Only UUID version 4 compliant strings allowed (randomly
     * generated).
     *
     * Type: string
     *
     * Required: true
     *
     * User-Readable Description: The unique identifier for the target
     * entity being referenced in this notification.
     *
     * Developer-Readable Description: ALPHA-1: Primary identifier field for
     * target entity connectivity. Critical for retrieval failure
     * prevention.
     *
     * Schema Position: Root Level
     *
     * Standard: RFC 4122
     *
     * Precedence: First field in all payloads
     *
     * Nullability: false
     *
     * Immutability: true
     *
     * Storage Type: char(36) in the database
     *
     * Source System: Notification Event Generator
     *
     * Usage Context: Always present in notification target references
     *
     * Expected Cardinality: Exactly one per notification target reference.
     *
     * Usage Pattern
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of the target entity.
     *
     * Indicates the specific category or kind of target entity. This field
     * helps determine the context and appropriate handling of the related
     * notification event. Common types include 'product', 'content',
     * 'post', 'comment', 'user', 'community', and 'promotion'. The entity
     * type guides the display context and linking behavior for the
     * notification.
     *
     * This field enables system logic to apply type-specific rules for
     * notification presentation, intent inference, and UI rendering. For
     * example:
     *
     * - A notification with type "comment" displays with a unique preview
     *   trailer
     * - A notification with type "product" shows an image and price
     * - A notification with type "user" displays the user's avatar
     *
     * Must be a valid, stable system type from the predefined set to ensure
     * interoperability with all systems that consume notification data.
     *
     * Values are lower case, singular, and use_snake_case to match database
     * entity naming conventions.
     *
     * Valid values (normalization required):
     *
     * - "content" (for articles, posts, stories)
     * - "post" (for forum posts)
     * - "comment" (for replies and comments)
     * - "user" (for user profiles)
     * - "community" (for forums, groups)
     * - "promotion" (for sales, deals)
     * - "product" (for market offerings)
     * - "category" (for taxonomy labels)
     *
     * These are NOT arbitrary - risk of breaking systems if new types are
     * introduced without documentation and integration.
     *
     * Any new type MUST be documented in CHANGELOG.md
     *
     * Date of Last Revision: 2024-02-15
     *
     * Value Examples: "content" "user" "product"
     *
     * Developer Context: Validated against centralized registry of entity
     * types.
     *
     * Type Definition: string of known, controlled values.
     *
     * Validation Framework: enum validation against approved set
     *
     * Data Type: string
     *
     * Required: true
     *
     * User-Readable Description: The kind of entity that triggered this
     * notification.
     *
     * Developer-Readable Description: ALPHA-2: Determines notification
     * rendering and behavior routing.
     *
     * Schema Position: Root Level
     *
     * Nullability: false
     *
     * Immutability: true
     *
     * Storage Type: ENUM (externalized in central registry)
     *
     * Source System: Notification Event Generator
     *
     * Usage Context: Always present in notification target references
     *
     * Expected Cardinality: Exactly one per notification target reference.
     *
     * Usage Pattern
     */
    type: string;

    /**
     * Display name of the target entity.
     *
     * The human-readable name or title of the target entity that appears in
     * user notifications. This field provides context about what the
     * notification relates to, such as a product name, post title, or
     * username. Should be appropriately localized and truncated for display
     * if necessary.
     *
     * This field allows notifications to display meaningful context without
     * forcing a client to make a separate API call. It includes the most
     * relevant identifying text where the recipient can immediately
     * understand what they're being notified about, even before
     * navigating.
     *
     * Text must be properly sanitized to prevent XSS. All HTML tags are
     * stripped.
     *
     * Truncation rules:
     *
     * - For long names (>100 characters), truncate to 80 characters and add
     *   ellipsis
     * - For user names, display handle or real name depending on privacy
     *   settings
     * - For products, display product name without SKU unless specifically
     *   required
     *
     * Must always be present when the target entity has a display name.
     *
     * If the target entity does not have a display name (uncommon case),
     * the system must generate a fallback.
     *
     * In all cases, this field must contain at least one visible, printable
     * character.
     *
     * Maximum Length: 255 Unicode characters (to prevent UI overflow)
     *
     * Minimum Length: 1 character (required field)
     *
     * Validation: Non-empty
     *
     * Type: string
     *
     * Required: true
     *
     * User-Readable Description: The name or title of the entity referenced
     * in this notification.
     *
     * Developer-Readable Description: ALPHA-3: Human readable identifier
     * for display purposes
     *
     * Schema Position: Root Level
     *
     * Nullability: false
     *
     * Immutability: false - can be updated if entity name changes
     *
     * Storage Type: varchar(255)
     *
     * Source System: Target Entity Registry
     *
     * Usage Context: Used in notification center and on-screen notification
     * UI
     *
     * Expected Cardinality: Exactly one per notification target reference.
     *
     * Usage Pattern
     */
    name: string;

    /**
     * Link to access or view the target entity.
     *
     * A fully qualified URL that directs the user to the specific page or
     * view of the target entity. This enables users to navigate directly to
     * the context of the notification with a single click. For example,
     * this could point to a product detail page, a forum post, or a user
     * profile.
     *
     * The URL must be:
     *
     * - Fully qualified (absolute URL with protocol - https://)
     * - Canonical (should not be a redirect)
     * - Accessible for the recipient (permissions enforced server-side)
     * - Stable (will not change after generation)
     *
     * URLs are generated at notification event creation time and should NOT
     * be computed client-side.
     *
     * Backend auto-generates these based on:
     *
     * - Entity type (product, post, comment, etc.)
     * - Entity ID
     * - User permissions
     * - Application routing rules
     * - URL aliases
     *
     * Use "/" path separator only. No HTTP redirects.
     *
     * Security Policy:
     *
     * URL MUST be: https:// URL MUST NOT be: data:, javascript:, ftp:,
     * file:, mailto:
     *
     * Failure Mode: If the URL is malformed or points to an inaccessible
     * resource, the notification link becomes dead and cannot be used for
     * navigation.
     *
     * SANITIZATION:
     *
     * Enforce URL encoding of parameters and string literals.
     *
     * UTF-8 encoding required.
     *
     * Example:
     * "https://community.example.com/products/b5e2a7f6-1c9a-4d2e-8a13-9e7f5c2d8f4f"
     *
     * Retrieval Integrity: Ensure service-side routing maps this URL
     * identically to the target entity ID.
     *
     * Manual Validation: No manual input - generated automatically.
     *
     * Required: true
     *
     * Type: string (uri)
     *
     * User-Readable Description: The web address to navigate to the
     * referenced entity.
     *
     * Developer-Readable Description: ALPHA-4: Deep link to entity page;
     * gateway to user action
     *
     * Schema Position: Root Level
     *
     * Nullability: false
     *
     * Immutability: true
     *
     * Storage Type: varchar(512)
     *
     * Source System: Router Middleware
     *
     * Usage Context: Always present in notification target references
     *
     * Expected Cardinality: Exactly one per notification target reference.
     *
     * Usage Pattern
     */
    url: string & tags.Format<"uri">;

    /**
     * Thumbnail or visual representation of the target entity.
     *
     * A URL to an image that visually represents the target entity. This
     * could be a product image, profile picture, or thumbnail for content.
     * Used for enhanced visual presentation in notification centers and
     * mobile notifications.
     *
     * This field is optimized for embedding in UI components and must
     * fulfill:
     *
     * - Support for standard image formats: JPEG, PNG, WebP, GIF
     * - Maximum file size: 100KB
     * - Resolution: No larger than 400x400 pixels
     * - Aspect Ratio: Prefer square (1:1) for consistent presentation
     *
     * Image MUST be:
     *
     * - Hosted on a CDN for reliability and speed
     * - Served over HTTPS
     * - Optimized for mobile networks
     * - Generated with cache-control headers to avoid re-fetches
     *
     * System generates an image URL automatically by:
     *
     * - Looking up the target entity's primary image
     * - Scaling/processing as needed
     * - Resolving through image CDN
     *
     * Fallback Behavior:
     *
     * - If no image exists: Use system default placeholder
     * - If image server fails: Use placeholder
     *
     * Issue: Invalid URLs will render as broken images in UIs.
     *
     * Validation:
     *
     * Format: URI Valid Protocol: https Valid Extension: .jpg, .jpeg, .png,
     * .webp, .gif
     *
     * Maximum Length: 500 characters
     *
     * Technical Constraints:
     *
     * - HTTPs only
     * - External origin only
     * - Zero redirects
     *
     * Example:
     * "https://cdn.example.com/images/products/b5e2a7f6-1c9a-4d2e-8a13-9e7f5c2d8f4f.jpeg"
     *
     * Required: false - if no image is available, this field is omitted
     *
     * Type: string (uri)
     *
     * User-Readable Description: An image representing the entity
     * referenced in this notification.
     *
     * Developer-Readable Description: ALPHA-5: Visual element for advanced
     * notification display
     *
     * Schema Position: Root Level
     *
     * Nullability: true
     *
     * Immutability: true - URL is generated at notification creation time
     *
     * Storage Type: varchar(500)
     *
     * Source System: Image Service
     *
     * Usage Context: Optional but recommended for product, user, and
     * content types
     *
     * Expected Cardinality: Zero or one per notification target reference.
     *
     * Usage Pattern
     */
    image_url?: (string & tags.Format<"uri">) | undefined;

    /**
     * Category classification of the target entity.
     *
     * A broad classification that groups similar types of entities
     * together. For example, 'product', 'content', or 'community'. When
     * available, this category helps with filtering, sorting, and
     * organizing notifications, and is often used to determine default
     * notification templates.
     *
     * This field provides a higher-level categorization than 'type',
     * enabling system-wide grouping of notifications. It is used for:
     *
     * - Dashboard views
     * - Notification filters
     * - UI categories
     * - Analytics segmentation
     * - Default template assignment
     *
     * Category names are predefined and limited to these values:
     *
     * - "product" - for commerce items
     * - "content" - for articles, posts, stories
     * - "user" - for user profiles
     * - "community" - for groups, forums, channels
     * - "promotion" - for sales, discounts, coupons
     * - "system" - for backend system events
     *
     * Validation:
     *
     * - Must match one of the predefined categories
     * - Case-insensitive
     * - Must not be empty
     *
     * In database:
     *
     * - Stored as string with corresponding ENUM values
     * - Referenced in notification template registry
     *
     * Classification Framework:
     *
     * - Level 1: Category - Apply broad grouping
     * - Level 2: Type - Apply specific entity type
     *
     * This structure allows efficient filtering at multiple levels.
     *
     * Required: true
     *
     * Type: string
     *
     * User-Readable Description: The broad category the target entity
     * belongs to.
     *
     * Developer-Readable Description: ALPHA-6: Triggers template selection
     * and filtering logic
     *
     * Schema Position: Root Level
     *
     * Nullability: false
     *
     * Immutability: true - assessed at notification event creation
     *
     * Storage Type: enum/string (controlled vocabulary)
     *
     * Source System: Target Entity Registry
     *
     * Usage Context: Always present in notification target references
     *
     * Expected Cardinality: Exactly one per notification target reference.
     *
     * Usage Pattern
     */
    category: string;

    /**
     * Current status of the target entity.
     *
     * Defines whether the entity is currently visible and active in the
     * system:
     *
     * - Active: Entity is active and accessible
     * - Archived: Entity is no longer active and typically hidden from public
     *   views
     * - Deleted: Entity has been permanently removed from the system
     *
     * This status affects how the notification is presented and whether the
     * target remains accessible.
     *
     * The status is evaluated at notification display time and may differ
     * from the status at notification creation time.
     *
     * For example, if a user posts a comment and it is later deleted, the
     * notification should still be visible but display an indicator that
     * the target has been removed.
     *
     * This field is used to:
     *
     * - Modify UI presentation (show "deleted" badge)
     * - Enable fallback text substitution
     * - Control link functionality (make links inactive for deleted)
     *
     * Data is derived from the target entity at time of notification
     * display.
     *
     * Valid values are:
     *
     * - "active" - entity exists and can be accessed
     * - "archived" - entity exists but is hidden from public view
     * - "deleted" - entity has been permanently purged
     *
     * The system MUST handle "deleted" and "archived" gracefully, never
     * returning unhandled errors.
     *
     * This field is critical for user experience consistency across time.
     *
     * Required: true
     *
     * Type: string
     *
     * User-Readable Description: The current visibility state of the
     * referenced target entity.
     *
     * Developer-Readable Description: ALPHA-7: Controls fallback behavior
     * and UI state
     *
     * Schema Position: Root Level
     *
     * Nullability: false
     *
     * Immutability: false - can change based on target entity state
     *
     * Storage Type: enum (persistent in revision history)
     *
     * Source System: Status Sync Service
     *
     * Usage Context: Always present in notification target references
     *
     * Expected Cardinality: Exactly one per notification target reference.
     *
     * Usage Pattern
     */
    status: "active" | "archived" | "deleted";
  };
}
